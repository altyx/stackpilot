import { QueryClient } from '@tanstack/react-query';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Alert, Text } from 'react-native';
import ContainerDetailScreen from '../app/endpoints/[endpointId]/containers/[containerId]';
import {
  fetchContainerLogs,
  fetchImageStatus,
  inspectContainer,
  listEndpoints,
  recreateContainer,
  removeContainer,
  runContainerAction,
} from '../src/api/portainer';
import { makeContainerInspect, makeEndpoint } from '../src/testing/fixtures';
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
  inspectContainer: jest.fn(),
  fetchImageStatus: jest.fn(),
  fetchContainerLogs: jest.fn(),
  recreateContainer: jest.fn(),
  runContainerAction: jest.fn(),
  removeContainer: jest.fn(),
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const Layout = createTestLayout(queryClient, { withHeader: true });

const List = () => <Text>Liste</Text>;

async function renderContainer(containerId = 'old') {
  renderRouter(
    {
      _layout: Layout,
      'endpoints/[endpointId]/containers/[containerId]': ContainerDetailScreen,
      '(drawer)/endpoints/[endpointId]/index': List,
    },
    { initialUrl: `/endpoints/1/containers/${containerId}` },
  );
  await screen.findByText('nginx:1.27');
}

beforeEach(() => {
  memory.clear();
  seedSession();
  queryClient.clear();
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  jest
    .mocked(inspectContainer)
    .mockImplementation((_session, _endpointId, id) =>
      Promise.resolve(makeContainerInspect({ Id: id })),
    );
  jest.mocked(listEndpoints).mockResolvedValue([makeEndpoint({ Id: 1 })]);
  jest.mocked(fetchContainerLogs).mockResolvedValue('');
});

describe('container detail screen', () => {
  it('shows no image status when the environment has no indicator', async () => {
    await renderContainer();
    await waitFor(() => expect(listEndpoints).toHaveBeenCalled());
    expect(fetchImageStatus).not.toHaveBeenCalled();
    expect(screen.queryByText("Statut de l'image indéterminé")).toBeNull();
  });

  it('shows the image status when Portainer provides it', async () => {
    jest
      .mocked(listEndpoints)
      .mockResolvedValue([makeEndpoint({ Id: 1, EnableImageNotification: true })]);
    jest.mocked(fetchImageStatus).mockResolvedValue('outdated');
    await renderContainer();
    expect(await screen.findByText("Mise à jour de l'image disponible")).toBeOnTheScreen();
    expect(fetchImageStatus).toHaveBeenCalledWith(expect.anything(), 1, 'old');
  });

  it('recreates the container with a fresh image after confirmation, then opens it', async () => {
    jest.mocked(recreateContainer).mockResolvedValue(makeContainerInspect({ Id: 'new' }));
    await renderContainer();

    fireEvent.press(screen.getByRole('button', { name: "Mettre à jour l'image" }));
    expect(screen.getByText("Mettre à jour l'image ?")).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Mettre à jour' }));

    await waitFor(() =>
      expect(recreateContainer).toHaveBeenCalledWith(expect.anything(), 1, 'old', true),
    );
    await waitFor(() => expect(screen).toHavePathname('/endpoints/1/containers/new'));
    expect(Alert.alert).toHaveBeenCalledWith('Image mise à jour', expect.stringContaining('web'));
  });

  it('withholds the update from the container running Portainer', async () => {
    jest
      .mocked(inspectContainer)
      .mockResolvedValue(makeContainerInspect({ Id: 'old', IsPortainer: true }));
    await renderContainer();
    expect(screen.queryByRole('button', { name: "Mettre à jour l'image" })).toBeNull();
    expect(screen.getByText(/son propre conteneur/)).toBeOnTheScreen();
  });

  function openMenu() {
    fireEvent.press(screen.getByRole('button', { name: "Plus d'actions" }));
  }

  it('keeps rarer actions behind the header menu and kills after confirmation', async () => {
    jest.mocked(runContainerAction).mockResolvedValue(undefined);
    await renderContainer();
    expect(screen.queryByRole('button', { name: 'Tuer' })).toBeNull();

    openMenu();
    expect(await screen.findByRole('button', { name: 'Mettre en pause' })).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Tuer' }));

    expect(await screen.findByText('Tuer le conteneur ?')).toBeOnTheScreen();
    fireEvent.press(screen.getAllByRole('button', { name: 'Tuer' }).at(-1)!);
    await waitFor(() =>
      expect(runContainerAction).toHaveBeenCalledWith(expect.anything(), 1, 'old', 'kill'),
    );
  });

  it('removes a running container by forcing it, then returns to the list', async () => {
    jest.mocked(removeContainer).mockResolvedValue(undefined);
    await renderContainer();

    openMenu();
    fireEvent.press(await screen.findByRole('button', { name: 'Supprimer le conteneur' }));
    expect(await screen.findByText(/sera arrêté puis supprimé/)).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Supprimer' }));

    await waitFor(() =>
      expect(removeContainer).toHaveBeenCalledWith(expect.anything(), 1, 'old', {
        force: true,
        removeVolumes: false,
      }),
    );
    await waitFor(() => expect(screen).toHavePathname('/endpoints/1'));
  });

  it('offers to take anonymous volumes along when the container has some', async () => {
    jest.mocked(removeContainer).mockResolvedValue(undefined);
    jest.mocked(inspectContainer).mockResolvedValue(
      makeContainerInspect({
        Id: 'old',
        Mounts: [{ Type: 'volume', Source: '/v', Destination: '/data', RW: true }],
      }),
    );
    await renderContainer();

    openMenu();
    fireEvent.press(await screen.findByRole('button', { name: 'Supprimer le conteneur' }));
    fireEvent(
      await screen.findByLabelText('Supprimer aussi ses volumes anonymes'),
      'valueChange',
      true,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Supprimer' }));
    await waitFor(() =>
      expect(removeContainer).toHaveBeenCalledWith(expect.anything(), 1, 'old', {
        force: true,
        removeVolumes: true,
      }),
    );
  });

  it('resumes a paused container from its main button, without confirmation', async () => {
    jest.mocked(runContainerAction).mockResolvedValue(undefined);
    jest.mocked(inspectContainer).mockResolvedValue(
      makeContainerInspect({
        Id: 'old',
        State: { ...makeContainerInspect().State, Status: 'paused', Paused: true },
      }),
    );
    await renderContainer();
    expect(screen.queryByRole('button', { name: 'Redémarrer' })).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Reprendre' }));
    await waitFor(() =>
      expect(runContainerAction).toHaveBeenCalledWith(expect.anything(), 1, 'old', 'unpause'),
    );
  });

  it("hides the menu on Portainer's own container", async () => {
    jest
      .mocked(inspectContainer)
      .mockResolvedValue(makeContainerInspect({ Id: 'old', IsPortainer: true }));
    await renderContainer();
    expect(screen.queryByRole('button', { name: "Plus d'actions" })).toBeNull();
  });
});
