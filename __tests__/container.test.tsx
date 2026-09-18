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
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const Layout = createTestLayout(queryClient);

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
});
