import { QueryClient } from '@tanstack/react-query';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Alert, Text } from 'react-native';
import StacksScreen from '../app/(drawer)/endpoints/[endpointId]/stacks';
import StackDetailScreen from '../app/endpoints/[endpointId]/stacks/[stackName]';
import { PortainerError } from '../src/api/client';
import {
  fetchImageStatus,
  fetchStackFile,
  fetchStackImageStatus,
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
  fetchStackImageStatus: jest.fn(),
  runContainerAction: jest.fn(),
  redeployStack: jest.fn(),
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const Layout = createTestLayout(queryClient);
const Container = () => <Text>Container detail</Text>;

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
    expect(screen.queryByText('No stack')).toBeNull();
    expect(screen.getByText('3 stacks · 2 managed by Portainer · 1 external')).toBeOnTheScreen();
    expect(screen.getByText('1/2 running')).toBeOnTheScreen();
    expect(screen.getByText('No containers')).toBeOnTheScreen();
  });

  it('filters by name', async () => {
    renderAt('/endpoints/1/stacks');
    await screen.findByText('blog');
    fireEvent.changeText(screen.getByPlaceholderText('Filter by name'), 'leg');
    expect(screen.queryByText('blog')).toBeNull();
    expect(screen.getByText('legacy')).toBeOnTheScreen();
  });

  it('still lists the stacks the containers reveal when Portainer refuses the stack list', async () => {
    jest.mocked(listStacks).mockRejectedValue(new PortainerError('Access denied', 403));
    renderAt('/endpoints/1/stacks');
    expect(await screen.findByText('blog')).toBeOnTheScreen();
    expect(screen.getAllByText('External')).toHaveLength(2);
    expect(screen.getByText(/Portainer details unavailable: Access denied/)).toBeOnTheScreen();
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
    expect(await screen.findByText('1/2 running')).toBeOnTheScreen();
    expect(screen.getByText('admin')).toBeOnTheScreen();
    expect(screen.getByText('docker-compose.yml')).toBeOnTheScreen();
    expect(screen.getByText('blog-web')).toBeOnTheScreen();
    expect(screen.getByText('blog-db')).toBeOnTheScreen();
    expect(screen.getByText('Europe/Paris')).toBeOnTheScreen();
    expect(screen.queryByText('hunter2')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Show DB_PASSWORD' }));
    expect(screen.getByText('hunter2')).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Show Compose file' }));
    expect(await screen.findByText('services:\n  web:\n    image: nginx')).toBeOnTheScreen();
    expect(fetchStackFile).toHaveBeenCalledWith(expect.anything(), 7);
  });

  it('describes an external stack without Portainer details', async () => {
    renderAt('/endpoints/1/stacks/legacy');
    expect(await screen.findByText('1/1 running')).toBeOnTheScreen();
    expect(screen.getByText(/deployed outside Portainer/i)).toBeOnTheScreen();
    expect(screen.queryByText('Show Compose file')).toBeNull();
    expect(screen.getByText('legacy-app')).toBeOnTheScreen();
  });

  it('stops the whole stack after confirmation', async () => {
    jest.mocked(runContainerAction).mockResolvedValue(undefined);
    renderAt('/endpoints/1/stacks/blog');
    fireEvent.press(await screen.findByRole('button', { name: 'Start / stop' }));
    fireEvent.press(screen.getByRole('button', { name: 'Stop stack' }));
    fireEvent.press(screen.getByRole('button', { name: 'Stop' }));
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
    expect(await screen.findByText('Stack not found')).toBeOnTheScreen();
  });

  describe('redeploy', () => {
    beforeEach(() => {
      jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
      jest.mocked(redeployStack).mockResolvedValue(undefined);
    });

    it('pulls the images and redeploys after confirmation', async () => {
      renderAt('/endpoints/1/stacks/blog');
      fireEvent.press(await screen.findByRole('button', { name: 'Redeploy' }));
      fireEvent.press(await screen.findByRole('button', { name: 'Pull images and redeploy' }));
      expect(screen.getByText(/several minutes/)).toBeOnTheScreen();
      fireEvent.press(screen.getAllByRole('button', { name: 'Redeploy' }).at(-1)!);

      await waitFor(() =>
        expect(redeployStack).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ Id: 7 }),
          { pullImages: true, env: undefined },
        ),
      );
      await waitFor(() =>
        expect(Alert.alert).toHaveBeenCalledWith('Stack redeployed', 'blog was redeployed.'),
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
      fireEvent.press(await screen.findByRole('button', { name: 'Redeploy' }));
      expect(await screen.findByText(/latest version of main/)).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Update from Git' })).toBeOnTheScreen();
    });

    it('does not offer it for an external stack', async () => {
      renderAt('/endpoints/1/stacks/legacy');
      await screen.findByText('1/1 running');
      expect(screen.queryByRole('button', { name: 'Redeploy' })).toBeNull();
    });

    it('edits the variables, shows what changes, then redeploys with them', async () => {
      renderAt('/endpoints/1/stacks/blog');
      fireEvent.press(await screen.findByRole('button', { name: 'Edit' }));

      fireEvent.changeText(screen.getByDisplayValue('Europe/Paris'), 'UTC');
      fireEvent.press(screen.getByRole('button', { name: 'Remove DB_PASSWORD' }));
      fireEvent.press(screen.getByRole('button', { name: '+ Add a variable' }));
      const names = screen.getAllByLabelText('Variable name');
      fireEvent.changeText(names.at(-1)!, 'LOG_LEVEL');
      fireEvent.changeText(screen.getAllByLabelText(/^Value of/).at(-1)!, ' debug ');
      fireEvent.press(screen.getByRole('button', { name: 'Save' }));

      expect(
        await screen.findByText(/Added: LOG_LEVEL\. Changed: TZ\. Removed: DB_PASSWORD\./),
      ).toBeOnTheScreen();
      fireEvent.press(screen.getByRole('button', { name: 'Save and redeploy' }));

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
      fireEvent.press(await screen.findByRole('button', { name: 'Edit' }));
      fireEvent.press(screen.getByRole('button', { name: '+ Add a variable' }));
      fireEvent.changeText(screen.getAllByLabelText('Variable name').at(-1)!, 'TZ');
      fireEvent.press(screen.getByRole('button', { name: 'Save' }));

      expect(screen.getByText('TZ is already defined above.')).toBeOnTheScreen();
      expect(screen.queryByText('Save and redeploy?')).toBeNull();
      expect(redeployStack).not.toHaveBeenCalled();
    });
  });

  describe('image status', () => {
    it("shows whether the stack's images are up to date when Portainer checks them", async () => {
      jest
        .mocked(listEndpoints)
        .mockResolvedValue([makeEndpoint({ Id: 1, EnableImageNotification: true })]);
      jest.mocked(fetchStackImageStatus).mockResolvedValue('outdated');
      // The member rows check their own image too, once the indicator is on.
      jest.mocked(fetchImageStatus).mockResolvedValue('updated');
      renderAt('/endpoints/1/stacks/blog');
      expect(await screen.findByText('Image update available')).toBeOnTheScreen();
      expect(fetchStackImageStatus).toHaveBeenCalledWith(expect.anything(), 7);
    });

    it('spells out up-to-date images on the detail screen, but not on the card', async () => {
      jest
        .mocked(listEndpoints)
        .mockResolvedValue([makeEndpoint({ Id: 1, EnableImageNotification: true })]);
      jest.mocked(fetchStackImageStatus).mockResolvedValue('updated');
      jest.mocked(fetchImageStatus).mockResolvedValue('updated');

      renderAt('/endpoints/1/stacks');
      await screen.findByText('blog');
      await waitFor(() => expect(fetchStackImageStatus).toHaveBeenCalled());
      expect(screen.queryByLabelText('Images up to date')).toBeNull();

      fireEvent.press(screen.getByText('blog'));
      expect(await screen.findByText('Images up to date')).toBeOnTheScreen();
    });

    it('asks nothing when the environment has no indicator', async () => {
      jest.mocked(fetchStackImageStatus).mockClear();
      renderAt('/endpoints/1/stacks/blog');
      await screen.findByText('1/2 running');
      await waitFor(() => expect(listEndpoints).toHaveBeenCalled());
      expect(fetchStackImageStatus).not.toHaveBeenCalled();
      expect(screen.queryByText('Images up to date')).toBeNull();
    });
  });
});
