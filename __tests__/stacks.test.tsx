import { QueryClient } from '@tanstack/react-query';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';
import StacksScreen from '../app/(drawer)/endpoints/[endpointId]/stacks';
import StackDetailScreen from '../app/endpoints/[endpointId]/stacks/[stackName]';
import { PortainerError } from '../src/api/client';
import {
  fetchStackFile,
  listContainers,
  listEndpoints,
  listStacks,
  runContainerAction,
} from '../src/api/portainer';
import { makeContainer, makeEndpoint, makeStack } from '../src/testing/fixtures';
import { memory } from '../src/testing/secureStoreMock';
import { createTestLayout, seedSession } from '../src/testing/TestLayout';

jest.mock(
  'expo-secure-store',
  () =>
    jest.requireActual<typeof import('../src/testing/secureStoreMock')>(
      '../src/testing/secureStoreMock',
    ).secureStoreMock,
);
jest.mock('../src/api/portainer', () => ({
  listEndpoints: jest.fn(),
  listContainers: jest.fn(),
  listStacks: jest.fn(),
  fetchStackFile: jest.fn(),
  fetchImageStatus: jest.fn(),
  runContainerAction: jest.fn(),
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const Layout = createTestLayout(queryClient);
const Container = () => <Text>Détail conteneur</Text>;

const compose = (project: string) => ({ 'com.docker.compose.project': project });
const containers = [
  makeContainer({ Id: 'w', Names: ['/blog-web'], Labels: compose('blog'), State: 'running' }),
  makeContainer({ Id: 'd', Names: ['/blog-db'], Labels: compose('blog'), State: 'exited' }),
  makeContainer({ Id: 'l', Names: ['/legacy-app'], Labels: compose('legacy') }),
  makeContainer({ Id: 'a', Names: ['/alone'], Labels: {} }),
];

function renderAt(initialUrl: string) {
  renderRouter(
    {
      _layout: Layout,
      '(drawer)/endpoints/[endpointId]/stacks': StacksScreen,
      'endpoints/[endpointId]/stacks/[stackName]': StackDetailScreen,
      'endpoints/[endpointId]/containers/[containerId]': Container,
    },
    { initialUrl },
  );
}

beforeEach(() => {
  memory.clear();
  seedSession();
  queryClient.clear();
  jest.mocked(listEndpoints).mockResolvedValue([makeEndpoint({ Id: 1 })]);
  jest.mocked(listContainers).mockResolvedValue(containers);
  jest.mocked(listStacks).mockResolvedValue([
    makeStack({
      Id: 7,
      Name: 'blog',
      CreatedBy: 'admin',
      Env: [
        { name: 'TZ', value: 'Europe/Paris' },
        { name: 'DB_PASSWORD', value: 'hunter2' },
      ],
    }),
    makeStack({ Id: 8, Name: 'archived', CreationDate: 0, CreatedBy: '' }),
  ]);
});

describe('stacks screen', () => {
  it('lists Portainer stacks and external ones, with a summary', async () => {
    renderAt('/endpoints/1/stacks');
    expect(await screen.findByText('blog')).toBeOnTheScreen();
    expect(screen.getByText('legacy')).toBeOnTheScreen();
    expect(screen.getByText('archived')).toBeOnTheScreen();
    expect(screen.queryByText('Sans stack')).toBeNull();
    expect(screen.getByText('3 stacks · 2 gérées par Portainer · 1 externe')).toBeOnTheScreen();
    expect(screen.getByText('1/2 en cours')).toBeOnTheScreen();
    expect(screen.getByText('Aucun conteneur')).toBeOnTheScreen();
  });

  it('filters by name', async () => {
    renderAt('/endpoints/1/stacks');
    await screen.findByText('blog');
    fireEvent.changeText(screen.getByPlaceholderText('Filtrer par nom'), 'leg');
    expect(screen.queryByText('blog')).toBeNull();
    expect(screen.getByText('legacy')).toBeOnTheScreen();
  });

  it('still lists the stacks the containers reveal when Portainer refuses the stack list', async () => {
    jest.mocked(listStacks).mockRejectedValue(new PortainerError('Accès refusé', 403));
    renderAt('/endpoints/1/stacks');
    expect(await screen.findByText('blog')).toBeOnTheScreen();
    expect(screen.getAllByText('Externe')).toHaveLength(2);
    expect(screen.getByText(/Détails Portainer indisponibles : Accès refusé/)).toBeOnTheScreen();
  });

  it('opens a stack', async () => {
    renderAt('/endpoints/1/stacks');
    fireEvent.press(await screen.findByText('blog'));
    await waitFor(() => expect(screen).toHavePathname('/endpoints/1/stacks/blog'));
  });
});

describe('stack detail screen', () => {
  it('shows Portainer details, members and the Compose file on demand', async () => {
    jest.mocked(fetchStackFile).mockResolvedValue('services:\n  web:\n    image: nginx');
    renderAt('/endpoints/1/stacks/blog');
    expect(await screen.findByText('1/2 en cours')).toBeOnTheScreen();
    expect(screen.getByText('admin')).toBeOnTheScreen();
    expect(screen.getByText('docker-compose.yml')).toBeOnTheScreen();
    expect(screen.getByText('blog-web')).toBeOnTheScreen();
    expect(screen.getByText('blog-db')).toBeOnTheScreen();
    expect(screen.getByText('Europe/Paris')).toBeOnTheScreen();
    expect(screen.queryByText('hunter2')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Afficher DB_PASSWORD' }));
    expect(screen.getByText('hunter2')).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Afficher le fichier Compose' }));
    expect(await screen.findByText('services:\n  web:\n    image: nginx')).toBeOnTheScreen();
    expect(fetchStackFile).toHaveBeenCalledWith(expect.anything(), 7);
  });

  it('describes an external stack without Portainer details', async () => {
    renderAt('/endpoints/1/stacks/legacy');
    expect(await screen.findByText('1/1 en cours')).toBeOnTheScreen();
    expect(screen.getByText(/déployée hors de Portainer/i)).toBeOnTheScreen();
    expect(screen.queryByText('Afficher le fichier Compose')).toBeNull();
    expect(screen.getByText('legacy-app')).toBeOnTheScreen();
  });

  it('stops the whole stack after confirmation', async () => {
    jest.mocked(runContainerAction).mockResolvedValue(undefined);
    renderAt('/endpoints/1/stacks/blog');
    fireEvent.press(await screen.findByRole('button', { name: 'Démarrer ou arrêter la stack' }));
    fireEvent.press(screen.getByRole('button', { name: 'Arrêter la stack' }));
    fireEvent.press(screen.getByRole('button', { name: 'Arrêter' }));
    await waitFor(() => expect(runContainerAction).toHaveBeenCalledTimes(2));
    expect(runContainerAction).toHaveBeenCalledWith(expect.anything(), 1, 'w', 'stop');
    expect(runContainerAction).toHaveBeenCalledWith(expect.anything(), 1, 'd', 'stop');
  });

  it('opens a member container', async () => {
    renderAt('/endpoints/1/stacks/blog');
    fireEvent.press(await screen.findByText('blog-web'));
    await waitFor(() => expect(screen).toHavePathname('/endpoints/1/containers/w'));
  });

  it('explains a stack that no longer exists', async () => {
    renderAt('/endpoints/1/stacks/ghost');
    expect(await screen.findByText('Stack introuvable')).toBeOnTheScreen();
  });
});
