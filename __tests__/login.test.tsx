import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';
import LoginScreen from '../app/login';
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

async function renderLogin() {
  renderRouter({ _layout: Layout, login: LoginScreen, index: Home }, { initialUrl: '/login' });
  // Lets the provider finish restoring the (empty) session.
  await screen.findByText('Connexion à Portainer');
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
    fireEvent.press(screen.getByRole('button', { name: 'Afficher la saisie' }));
    expect(token).toHaveProp('secureTextEntry', false);
  });

  it('switches to username and password', async () => {
    await renderLogin();
    fireEvent.press(screen.getByRole('button', { name: 'Identifiants' }));
    expect(screen.getByText('Utilisateur')).toBeOnTheScreen();
    expect(screen.getByText('Mot de passe')).toBeOnTheScreen();
    expect(screen.queryByPlaceholderText('ptr_…')).toBeNull();
  });

  it('signs in with the token and lands on the home route', async () => {
    jest.mocked(loginWithApiKey).mockResolvedValue({
      baseUrl: 'https://portainer.lan',
      mode: 'apiKey',
      token: 'ptr_abc',
    });
    await renderLogin();

    const submit = screen.getByRole('button', { name: 'Se connecter' });
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
});
