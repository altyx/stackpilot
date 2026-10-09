import { QueryClient } from '@tanstack/react-query';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import * as Clipboard from 'expo-clipboard';
import { Alert, Share, Text } from 'react-native';
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
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));
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
  jest.mocked(fetchContainerLogs).mockResolvedValue([]);
});

describe('container detail screen', () => {
  it('shows no image status when the environment has no indicator', async () => {
    await renderContainer();
    await waitFor(() => expect(listEndpoints).toHaveBeenCalled());
    expect(fetchImageStatus).not.toHaveBeenCalled();
    expect(screen.queryByText('Image status unknown')).toBeNull();
  });

  it('shows the image status when Portainer provides it', async () => {
    jest
      .mocked(listEndpoints)
      .mockResolvedValue([makeEndpoint({ Id: 1, EnableImageNotification: true })]);
    jest.mocked(fetchImageStatus).mockResolvedValue('outdated');
    await renderContainer();
    expect(await screen.findByText('Image update available')).toBeOnTheScreen();
    expect(fetchImageStatus).toHaveBeenCalledWith(expect.anything(), 1, 'old');
  });

  it('recreates the container with a fresh image after confirmation, then opens it', async () => {
    jest.mocked(recreateContainer).mockResolvedValue(makeContainerInspect({ Id: 'new' }));
    await renderContainer();

    fireEvent.press(screen.getByRole('button', { name: 'Update image' }));
    expect(screen.getByText('Update image?')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() =>
      expect(recreateContainer).toHaveBeenCalledWith(expect.anything(), 1, 'old', true),
    );
    await waitFor(() => expect(screen).toHavePathname('/endpoints/1/containers/new'));
    expect(Alert.alert).toHaveBeenCalledWith('Image updated', expect.stringContaining('web'));
  });

  it('withholds the update from the container running Portainer', async () => {
    jest
      .mocked(inspectContainer)
      .mockResolvedValue(makeContainerInspect({ Id: 'old', IsPortainer: true }));
    await renderContainer();
    expect(screen.queryByRole('button', { name: 'Update image' })).toBeNull();
    expect(screen.getByText(/its own container/)).toBeOnTheScreen();
  });

  function openMenu() {
    fireEvent.press(screen.getByRole('button', { name: 'More actions' }));
  }

  it('keeps rarer actions behind the header menu and kills after confirmation', async () => {
    jest.mocked(runContainerAction).mockResolvedValue(undefined);
    await renderContainer();
    expect(screen.queryByRole('button', { name: 'Kill' })).toBeNull();

    openMenu();
    expect(await screen.findByRole('button', { name: 'Pause' })).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Kill' }));

    expect(await screen.findByText('Kill container?')).toBeOnTheScreen();
    fireEvent.press(screen.getAllByRole('button', { name: 'Kill' }).at(-1)!);
    await waitFor(() =>
      expect(runContainerAction).toHaveBeenCalledWith(expect.anything(), 1, 'old', 'kill'),
    );
  });

  it('removes a running container by forcing it, then returns to the list', async () => {
    jest.mocked(removeContainer).mockResolvedValue(undefined);
    await renderContainer();

    openMenu();
    fireEvent.press(await screen.findByRole('button', { name: 'Delete container' }));
    expect(await screen.findByText(/will be stopped, then deleted/)).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Delete' }));

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
    fireEvent.press(await screen.findByRole('button', { name: 'Delete container' }));
    fireEvent(
      await screen.findByLabelText('Also delete its anonymous volumes'),
      'valueChange',
      true,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
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
    expect(screen.queryByRole('button', { name: 'Restart' })).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Resume' }));
    await waitFor(() =>
      expect(runContainerAction).toHaveBeenCalledWith(expect.anything(), 1, 'old', 'unpause'),
    );
  });

  it("hides the menu on Portainer's own container", async () => {
    jest
      .mocked(inspectContainer)
      .mockResolvedValue(makeContainerInspect({ Id: 'old', IsPortainer: true }));
    await renderContainer();
    expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull();
  });

  describe('logs', () => {
    const lines = [
      { timestamp: '2026-10-07T12:00:00.100Z', text: 'booting' },
      { timestamp: '2026-10-07T12:00:01.200Z', text: 'ready' },
    ];

    async function openLogs() {
      await renderContainer();
      fireEvent.press(screen.getByRole('button', { name: 'Show logs' }));
      await screen.findByText('ready');
    }

    beforeEach(() => {
      jest.mocked(fetchContainerLogs).mockResolvedValue(lines);
    });

    it('loads only when asked, the last 500 lines by default', async () => {
      await renderContainer();
      expect(fetchContainerLogs).not.toHaveBeenCalled();
      fireEvent.press(screen.getByRole('button', { name: 'Show logs' }));
      expect(await screen.findByText('booting')).toBeOnTheScreen();
      expect(fetchContainerLogs).toHaveBeenCalledWith(expect.anything(), 1, 'old', {
        tail: 500,
        since: undefined,
      });
      expect(screen.getByText('2 lines')).toBeOnTheScreen();
    });

    it('switches to a period, asking Docker for the lines since then', async () => {
      await openLogs();
      fireEvent.press(screen.getByRole('button', { name: '1 h' }));
      await waitFor(() =>
        expect(fetchContainerLogs).toHaveBeenLastCalledWith(expect.anything(), 1, 'old', {
          tail: undefined,
          since: expect.stringMatching(/^\d+$/) as unknown,
        }),
      );
    });

    it('shows the time of each line on demand', async () => {
      await openLogs();
      // The time is a Text nested in the line's: matched by substring.
      expect(screen.queryAllByText(/\d{2}:\d{2}:01\.200/)).toHaveLength(0);
      fireEvent.press(screen.getByRole('button', { name: 'Show timestamps' }));
      expect(screen.queryAllByText(/\d{2}:\d{2}:01\.200/).length).toBeGreaterThan(0);
    });

    it('copies and shares the lines, with timestamps when shown', async () => {
      const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
      await openLogs();
      fireEvent.press(screen.getByRole('button', { name: 'Copy logs' }));
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith('booting\nready');
      expect(await screen.findByRole('button', { name: 'Logs copied' })).toBeOnTheScreen();

      fireEvent.press(screen.getByRole('button', { name: 'Show timestamps' }));
      fireEvent.press(screen.getByRole('button', { name: 'Share logs' }));
      expect(shareSpy).toHaveBeenCalledWith({
        title: 'Logs for web',
        message: '2026-10-07T12:00:00.100Z booting\n2026-10-07T12:00:01.200Z ready',
      });
    });

    it('opens and closes the full screen view with the same toggle', async () => {
      await openLogs();
      fireEvent.press(screen.getByRole('button', { name: 'Full screen' }));
      expect(await screen.findByText('Logs · web')).toBeOnTheScreen();
      // The controls exist both in the card and over it: the modal's come last.
      fireEvent.press(screen.getAllByRole('button', { name: 'Exit full screen' }).at(-1)!);
      await waitFor(() => expect(screen.queryByText('Logs · web')).toBeNull());
    });

    it('follows live, asking only for the lines after the last one', async () => {
      await openLogs();
      jest.useFakeTimers();
      try {
        jest.mocked(fetchContainerLogs).mockResolvedValue([
          { timestamp: '2026-10-07T12:00:01.200Z', text: 'ready' },
          { timestamp: '2026-10-07T12:00:02.300Z', text: 'request served' },
        ]);
        fireEvent.press(screen.getByRole('button', { name: 'Follow live' }));
        // Past the poll, plus React Query's batched notification (a timer too).
        await act(async () => {
          await jest.advanceTimersByTimeAsync(2100);
        });
        expect(fetchContainerLogs).toHaveBeenLastCalledWith(expect.anything(), 1, 'old', {
          since: '1791374401.200',
          tail: undefined,
        });
        expect(screen.getByText('request served')).toBeOnTheScreen();
        // The repeated last line isn't doubled.
        expect(screen.getAllByText('ready')).toHaveLength(1);
        expect(screen.getByText('3 lines · live')).toBeOnTheScreen();
        // Unmounted under fake timers, so the poll is cleared by the same clock.
        screen.unmount();
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
