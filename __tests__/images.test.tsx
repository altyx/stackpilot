import { QueryClient } from '@tanstack/react-query';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Alert } from 'react-native';
import ImagesScreen from '../app/(drawer)/endpoints/[endpointId]/images';
import { PortainerError } from '../src/api/client';
import {
  fetchImageStatus,
  listContainers,
  listEndpoints,
  listImages,
  pruneImages,
  removeImage,
} from '../src/api/portainer';
import { makeContainer, makeEndpoint, makeImage } from '../src/testing/fixtures';
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
  listImages: jest.fn(),
  removeImage: jest.fn(),
  pruneImages: jest.fn(),
  fetchImageStatus: jest.fn(),
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const Layout = createTestLayout(queryClient);

const used = makeImage({ Id: 'sha256:used', RepoTags: ['nginx:1.27'], Size: 100 });
const tagged = makeImage({ Id: 'sha256:old', RepoTags: ['app:1', 'app:latest'], Size: 2_000 });
const dangling = makeImage({ Id: 'sha256:dangling', RepoTags: [], Size: 3_000 });

async function renderImages(initialUrl = '/endpoints/1/images') {
  renderRouter(
    { _layout: Layout, '(drawer)/endpoints/[endpointId]/images': ImagesScreen },
    { initialUrl },
  );
  await screen.findByText('nginx:1.27');
}

beforeEach(() => {
  memory.clear();
  seedSession();
  queryClient.clear();
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  jest.mocked(listEndpoints).mockResolvedValue([makeEndpoint({ Id: 1 })]);
  jest.mocked(listImages).mockResolvedValue([used, tagged, dangling]);
  jest
    .mocked(listContainers)
    .mockResolvedValue([makeContainer({ Image: 'nginx:1.27', ImageID: 'sha256:used' })]);
});

describe('images screen', () => {
  it('offers deletion on unused images only', async () => {
    await renderImages();
    expect(screen.getByRole('button', { name: 'Delete app:1' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Delete nginx:1.27' })).toBeNull();
  });

  it('deletes an image after confirmation, forcing when it carries several tags', async () => {
    jest.mocked(removeImage).mockResolvedValue([{ Deleted: 'sha256:old' }]);
    await renderImages();

    fireEvent.press(screen.getByRole('button', { name: 'Delete app:1' }));
    expect(screen.getByText(/along with its 2 tags/)).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Delete image' }));

    await waitFor(() =>
      expect(removeImage).toHaveBeenCalledWith(expect.anything(), 1, 'sha256:old', true),
    );
    await waitFor(() => expect(listImages).toHaveBeenCalledTimes(2));
  });

  it('reports a failed deletion', async () => {
    jest.mocked(removeImage).mockRejectedValue(new PortainerError('Image in use', 409));
    await renderImages();

    fireEvent.press(screen.getByRole('button', { name: 'Delete app:1' }));
    fireEvent.press(screen.getByRole('button', { name: 'Delete image' }));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Delete failed', 'Image in use'));
  });

  it('prunes untagged images only, then reports what was freed', async () => {
    jest.mocked(pruneImages).mockResolvedValue({
      deleted: [{ Deleted: 'sha256:dangling' }, { Deleted: 'sha256:layer' }],
      spaceReclaimed: 3_000,
    });
    await renderImages();

    fireEvent.press(screen.getByRole('button', { name: 'Clean up images' }));
    fireEvent.press(screen.getByRole('button', { name: 'Untagged images · 1 · 3.0 kB' }));
    expect(screen.getByText('Delete image?')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Clean up' }));

    await waitFor(() => expect(pruneImages).toHaveBeenCalledWith(expect.anything(), 1, 'dangling'));
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Cleanup complete',
        '1 image deleted · 3.0 kB freed.',
      ),
    );
  });

  it('prunes every unused image when asked', async () => {
    jest.mocked(pruneImages).mockResolvedValue({ deleted: [], spaceReclaimed: 0 });
    await renderImages();

    fireEvent.press(screen.getByRole('button', { name: 'Clean up images' }));
    fireEvent.press(screen.getByRole('button', { name: 'All unused images · 2 · 5.0 kB' }));
    expect(screen.getByText('Delete 2 images?')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Clean up' }));

    await waitFor(() => expect(pruneImages).toHaveBeenCalledWith(expect.anything(), 1, 'unused'));
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('Cleanup complete', 'No image was deleted.'),
    );
  });

  it('opens on the outdated images when the overview asks for them', async () => {
    jest
      .mocked(listEndpoints)
      .mockResolvedValue([makeEndpoint({ Id: 1, EnableImageNotification: true })]);
    jest.mocked(fetchImageStatus).mockResolvedValue('outdated');
    await renderImages('/endpoints/1/images?filter=outdated');

    expect(await screen.findByText(/New version available/)).toBeOnTheScreen();
    expect(screen.getByText('nginx:1.27')).toBeOnTheScreen();
    expect(screen.queryByText('app:1')).toBeNull();
    expect(screen.getByRole('button', { name: 'Outdated' })).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ selected: true }),
    );
  });

  it('offers the outdated filter only when Portainer compares images', async () => {
    await renderImages();
    expect(screen.queryByRole('button', { name: 'Outdated' })).toBeNull();
    expect(fetchImageStatus).not.toHaveBeenCalled();
  });
});
