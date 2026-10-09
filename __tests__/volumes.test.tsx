import { QueryClient } from '@tanstack/react-query';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Alert } from 'react-native';
import VolumesScreen from '../app/(drawer)/endpoints/[endpointId]/volumes';
import { PortainerError } from '../src/api/client';
import {
  fetchDiskUsage,
  fetchDockerInfo,
  listContainers,
  listEndpoints,
  listVolumes,
  pruneVolumes,
  removeVolume,
} from '../src/api/portainer';
import { makeContainer, makeEndpoint, makeVolume } from '../src/testing/fixtures';
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
  listVolumes: jest.fn(),
  fetchDiskUsage: jest.fn(),
  fetchDockerInfo: jest.fn(),
  removeVolume: jest.fn(),
  pruneVolumes: jest.fn(),
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const Layout = createTestLayout(queryClient);

const pgdata = makeVolume({ Name: 'pgdata' });
const cache = makeVolume({ Name: 'cache' });

async function renderVolumes() {
  renderRouter(
    { _layout: Layout, '(drawer)/endpoints/[endpointId]/volumes': VolumesScreen },
    { initialUrl: '/endpoints/1/volumes' },
  );
  await screen.findByText('pgdata');
}

beforeEach(() => {
  memory.clear();
  seedSession();
  queryClient.clear();
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  jest.mocked(listEndpoints).mockResolvedValue([makeEndpoint({ Id: 1 })]);
  jest.mocked(listVolumes).mockResolvedValue([pgdata, cache]);
  jest.mocked(listContainers).mockResolvedValue([
    makeContainer({
      Mounts: [{ Type: 'volume', Name: 'cache', Source: '', Destination: '/c', RW: true }],
    }),
  ]);
  jest.mocked(fetchDockerInfo).mockResolvedValue({ NCPU: 2, MemTotal: 1, ServerVersion: '27.1.0' });
  jest.mocked(fetchDiskUsage).mockResolvedValue({
    Volumes: [{ Name: 'pgdata', UsageData: { Size: 3_000_000_000, RefCount: 0 } }],
  });
});

describe('volumes screen', () => {
  it('shows sizes and offers deletion on unused volumes only', async () => {
    await renderVolumes();
    expect(await screen.findByText(/3.0 GB reclaimable/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Delete pgdata' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Delete cache' })).toBeNull();
  });

  it('deletes a volume only once its name is typed', async () => {
    jest.mocked(removeVolume).mockResolvedValue(undefined);
    await renderVolumes();

    fireEvent.press(screen.getByRole('button', { name: 'Delete pgdata' }));
    expect(await screen.findByText(/all its data will be permanently deleted/)).toBeOnTheScreen();
    const confirm = screen.getByRole('button', { name: 'Delete permanently' });
    expect(confirm).toBeDisabled();
    fireEvent.changeText(screen.getByLabelText('Type pgdata to confirm'), 'pgdata');
    fireEvent.press(confirm);

    await waitFor(() => expect(removeVolume).toHaveBeenCalledWith(expect.anything(), 1, 'pgdata'));
    await waitFor(() => expect(listVolumes).toHaveBeenCalledTimes(2));
  });

  it('reports a refused deletion', async () => {
    jest.mocked(removeVolume).mockRejectedValue(new PortainerError('Volume in use', 409));
    await renderVolumes();
    fireEvent.press(screen.getByRole('button', { name: 'Delete pgdata' }));
    fireEvent.changeText(screen.getByLabelText('Type pgdata to confirm'), 'pgdata');
    fireEvent.press(screen.getByRole('button', { name: 'Delete permanently' }));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Delete failed', 'Volume in use'));
  });

  it('prunes every unused volume after confirmation and reports it', async () => {
    jest
      .mocked(pruneVolumes)
      .mockResolvedValue({ deleted: ['pgdata'], spaceReclaimed: 3_000_000_000 });
    await renderVolumes();

    fireEvent.press(screen.getByRole('button', { name: 'Clean up volumes' }));
    fireEvent.press(await screen.findByRole('button', { name: /^All unused volumes/ }));
    fireEvent.changeText(screen.getByLabelText('Type delete to confirm'), 'delete');
    fireEvent.press(screen.getByRole('button', { name: 'Delete permanently' }));

    await waitFor(() => expect(pruneVolumes).toHaveBeenCalledWith(expect.anything(), 1, 'all'));
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Cleanup complete',
        '1 volume deleted · 3.0 GB freed.',
      ),
    );
  });
});
