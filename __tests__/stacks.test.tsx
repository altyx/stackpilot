import { QueryClient } from '@tanstack/react-query';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Alert, Text } from 'react-native';
import StacksScreen from '../app/(drawer)/endpoints/[endpointId]/stacks';
import StackDetailScreen from '../app/endpoints/[endpointId]/stacks/[stackName]';
import { PortainerError } from '../src/api/client';
import {
  fetchStackFile,
  listContainers,
  listEndpoints,
  listStacks,
  redeployStack,
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
  redeployStack: jest.fn(),
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
    fireEvent.press(await screen.findByRole('button', { name: 'Marche / arrêt' }));
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

  describe('redeploy', () => {
    beforeEach(() => {
      jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
      jest.mocked(redeployStack).mockResolvedValue(undefined);
    });

    it('pulls the images and redeploys after confirmation', async () => {
      renderAt('/endpoints/1/stacks/blog');
      fireEvent.press(await screen.findByRole('button', { name: 'Redéployer' }));
      fireEvent.press(
        await screen.findByRole('button', { name: 'Retélécharger les images et redéployer' }),
      );
      expect(screen.getByText(/plusieurs minutes/)).toBeOnTheScreen();
      fireEvent.press(screen.getAllByRole('button', { name: 'Redéployer' }).at(-1)!);

      await waitFor(() =>
        expect(redeployStack).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ Id: 7 }),
          { pullImages: true, env: undefined },
        ),
      );
      await waitFor(() =>
        expect(Alert.alert).toHaveBeenCalledWith('Stack redéployée', 'blog a été redéployée.'),
      );
    });

    it('offers a Git update for a stack linked to a repository', async () => {
      jest.mocked(listStacks).mockResolvedValue([
        makeStack({
          Id: 7,
          Name: 'blog',
          GitConfig: {
            URL: 'https://git.lan/blog.git',
            ReferenceName: 'refs/heads/main',
            ConfigFilePath: 'compose.yml',
          },
        }),
      ]);
      renderAt('/endpoints/1/stacks/blog');
      fireEvent.press(await screen.findByRole('button', { name: 'Redéployer' }));
      expect(await screen.findByText(/dernière version de main/)).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Mettre à jour depuis Git' })).toBeOnTheScreen();
    });

    it('does not offer it for an external stack', async () => {
      renderAt('/endpoints/1/stacks/legacy');
      await screen.findByText('1/1 en cours');
      expect(screen.queryByRole('button', { name: 'Redéployer' })).toBeNull();
    });

    it('edits the variables, shows what changes, then redeploys with them', async () => {
      renderAt('/endpoints/1/stacks/blog');
      fireEvent.press(await screen.findByRole('button', { name: 'Modifier' }));

      fireEvent.changeText(screen.getByDisplayValue('Europe/Paris'), 'UTC');
      fireEvent.press(screen.getByRole('button', { name: 'Retirer DB_PASSWORD' }));
      fireEvent.press(screen.getByRole('button', { name: '+ Ajouter une variable' }));
      const names = screen.getAllByLabelText('Nom de la variable');
      fireEvent.changeText(names.at(-1)!, 'LOG_LEVEL');
      fireEvent.changeText(screen.getAllByLabelText(/^Valeur de/).at(-1)!, ' debug ');
      fireEvent.press(screen.getByRole('button', { name: 'Enregistrer' }));

      expect(
        await screen.findByText(/Ajoutées : LOG_LEVEL\. Modifiées : TZ\. Retirées : DB_PASSWORD\./),
      ).toBeOnTheScreen();
      fireEvent.press(screen.getByRole('button', { name: 'Enregistrer et redéployer' }));

      await waitFor(() =>
        expect(redeployStack).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ Id: 7 }),
          {
            pullImages: false,
            // The value keeps its spaces: it goes exactly as typed.
            env: [
              { name: 'TZ', value: 'UTC' },
              { name: 'LOG_LEVEL', value: ' debug ' },
            ],
          },
        ),
      );
    });

    it('refuses to save duplicate names', async () => {
      renderAt('/endpoints/1/stacks/blog');
      fireEvent.press(await screen.findByRole('button', { name: 'Modifier' }));
      fireEvent.press(screen.getByRole('button', { name: '+ Ajouter une variable' }));
      fireEvent.changeText(screen.getAllByLabelText('Nom de la variable').at(-1)!, 'TZ');
      fireEvent.press(screen.getByRole('button', { name: 'Enregistrer' }));

      expect(screen.getByText('TZ est déjà défini plus haut.')).toBeOnTheScreen();
      expect(screen.queryByText('Enregistrer et redéployer ?')).toBeNull();
      expect(redeployStack).not.toHaveBeenCalled();
    });
  });
});
