import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';
import LoginScreen from '../app/login';
import { PortainerError } from '../src/api/client';
import { loginWithApiKey } from '../src/api/portainer';
import { AuthProvider } from '../src/auth/AuthContext';
import { memory } from '../src/testing/secureStoreMock';

jest.mock(
  'expo-secure-store',
  () =>
    jest.requireActual<typeof import('../src/testing/secureStoreMock')>(
      '../src/testing/secureStoreMock',
    ).secureStoreMock,
);
jest.mock('../src/api/portainer', () => ({
  loginWithApiKey: jest.fn(),
  loginWithPassword: jest.fn(),
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function Layout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Slot />
      </AuthProvider>
    </QueryClientProvider>
  );
}

const Home = () => <Text>Accueil</Text>;
const Certificates = () => <Text>Aide certificat</Text>;

async function renderLogin() {
  renderRouter(
    { _layout: Layout, login: LoginScreen, index: Home, certificates: Certificates },
    { initialUrl: '/login' },
  );
  // Lets the provider finish restoring the (empty) session.
  await screen.findByText('Sign in to Portainer');
}

beforeEach(() => {
  memory.clear();
  queryClient.clear();
});

describe('login screen', () => {
  it('asks for the instance and an access token, masked until revealed', async () => {
    await renderLogin();
    const token = screen.getByPlaceholderText('ptr_…');
    expect(token).toHaveProp('secureTextEntry', true);
    fireEvent.press(screen.getByRole('button', { name: 'Show input' }));
    expect(token).toHaveProp('secureTextEntry', false);
  });

  it('switches to username and password', async () => {
    await renderLogin();
    fireEvent.press(screen.getByRole('button', { name: 'Credentials' }));
    expect(screen.getByText('Username')).toBeOnTheScreen();
    expect(screen.getByText('Password')).toBeOnTheScreen();
    expect(screen.queryByPlaceholderText('ptr_…')).toBeNull();
  });

  it('signs in with the token and lands on the home route', async () => {
    jest.mocked(loginWithApiKey).mockResolvedValue({
      baseUrl: 'https://portainer.lan',
      mode: 'apiKey',
      token: 'ptr_abc',
    });
    await renderLogin();

    const submit = screen.getByRole('button', { name: 'Sign in' });
    expect(submit).toBeDisabled();
    fireEvent.changeText(
      screen.getByPlaceholderText('https://portainer.local:9443'),
      'portainer.lan',
    );
    fireEvent.changeText(screen.getByPlaceholderText('ptr_…'), 'ptr_abc');
    expect(submit).toBeEnabled();

    fireEvent.press(submit);
    await waitFor(() => expect(screen).toHavePathname('/'));
    expect(loginWithApiKey).toHaveBeenCalledWith('portainer.lan', 'ptr_abc');
    expect(memory.get('portainer.session')).toContain('ptr_abc');
  });

  function submitToken() {
    fireEvent.changeText(
      screen.getByPlaceholderText('https://portainer.local:9443'),
      'portainer.lan',
    );
    fireEvent.changeText(screen.getByPlaceholderText('ptr_…'), 'ptr_abc');
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
  }

  it('points at the certificate help when the HTTPS connection is refused', async () => {
    jest
      .mocked(loginWithApiKey)
      .mockRejectedValue(new PortainerError('Connection refused.', undefined, 'x', 'certificate'));
    await renderLogin();
    submitToken();

    fireEvent.press(await screen.findByText('Fix a certificate problem'));
    await waitFor(() => expect(screen).toHavePathname('/certificates'));
  });

  it('offers no certificate help for other errors', async () => {
    jest
      .mocked(loginWithApiKey)
      .mockRejectedValue(new PortainerError('Authentication refused.', 401));
    await renderLogin();
    submitToken();

    expect(await screen.findByText('Authentication refused.')).toBeOnTheScreen();
    expect(screen.queryByText('Fix a certificate problem')).toBeNull();
  });
});
