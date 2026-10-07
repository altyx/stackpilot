import { QueryClient } from '@tanstack/react-query';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';
import OverviewScreen from '../app/(drawer)/endpoints/[endpointId]/overview';
import {
  fetchContainerStats,
  fetchDiskUsage,
  fetchDockerInfo,
  fetchImageStatus,
  listContainers,
  listEndpoints,
  listImages,
  listStacks,
  listVolumes,
} from '../src/api/portainer';
import type { ContainerStatsResponse } from '../src/api/types';
import {
  makeContainer,
  makeEndpoint,
  makeImage,
  makeStack,
  makeVolume,
} from '../src/testing/fixtures';
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
  listImages: jest.fn(),
  listVolumes: jest.fn(),
  fetchDockerInfo: jest.fn(),
  fetchDiskUsage: jest.fn(),
  fetchContainerStats: jest.fn(),
  fetchImageStatus: jest.fn(),
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const Layout = createTestLayout(queryClient);
const Containers = () => <Text>Liste des conteneurs</Text>;
const ContainerDetail = () => <Text>Détail conteneur</Text>;
const Images = () => <Text>Liste des images</Text>;

const compose = (project: string) => ({ 'com.docker.compose.project': project });
const web = makeContainer({
  Id: 'web',
  Names: ['/web'],
  Image: 'nginx:1.27',
  ImageID: 'sha256:nginx',
  Status: 'Up 2 hours (healthy)',
  Labels: compose('blog'),
});
const db = makeContainer({
  Id: 'db',
  Names: ['/db'],
  Image: 'postgres:16',
  ImageID: 'sha256:pg',
  Status: 'Up 2 hours (unhealthy)',
  Labels: compose('blog'),
});
const worker = makeContainer({
  Id: 'worker',
  Names: ['/worker'],
  State: 'exited',
  Status: 'Exited (1) 5 minutes ago',
  Labels: compose('jobs'),
});

/** `cpu` is the share of one core over the sample, on a 2-core host. */
function stats(cpu: number, memory: number): ContainerStatsResponse {
  return {
    cpu_stats: { cpu_usage: { total_usage: cpu * 20 }, system_cpu_usage: 4_000, online_cpus: 2 },
    precpu_stats: { cpu_usage: { total_usage: 0 }, system_cpu_usage: 0 },
    memory_stats: { usage: memory },
  };
}

function renderOverview() {
  renderRouter(
    {
      _layout: Layout,
      '(drawer)/endpoints/[endpointId]/overview': OverviewScreen,
      '(drawer)/endpoints/[endpointId]/index': Containers,
      'endpoints/[endpointId]/containers/[containerId]': ContainerDetail,
      '(drawer)/endpoints/[endpointId]/images': Images,
    },
    { initialUrl: '/endpoints/1/overview' },
  );
}

beforeEach(() => {
  memory.clear();
  seedSession();
  queryClient.clear();
  jest.clearAllMocks();
  jest.mocked(listEndpoints).mockResolvedValue([makeEndpoint({ Id: 1 })]);
  jest.mocked(listContainers).mockResolvedValue([web, db, worker]);
  jest.mocked(listStacks).mockResolvedValue([makeStack({ Name: 'blog' })]);
  jest
    .mocked(listImages)
    .mockResolvedValue([
      makeImage({ Id: 'sha256:nginx', RepoTags: ['nginx:1.27'] }),
      makeImage({ Id: 'sha256:old', RepoTags: ['old:1'] }),
    ]);
  jest.mocked(listVolumes).mockResolvedValue([makeVolume({ Name: 'pgdata' })]);
  jest.mocked(fetchDockerInfo).mockResolvedValue({ NCPU: 2, MemTotal: 4_000_000_000 });
  jest
    .mocked(fetchContainerStats)
    .mockImplementation((_session, _endpoint, id) =>
      Promise.resolve(id === 'web' ? stats(30, 500_000_000) : stats(90, 1_500_000_000)),
    );
  jest.mocked(fetchDiskUsage).mockResolvedValue({
    LayersSize: 3_000_000_000,
    Images: [{ Size: 1_000_000_000, SharedSize: 0, Containers: 0 }],
    Containers: [],
    Volumes: [{ UsageData: { Size: 2_000_000_000, RefCount: 1 } }],
    BuildCache: [],
  });
});

describe('overview screen', () => {
  it('lists the containers needing a look, most urgent first', async () => {
    renderOverview();
    expect(await screen.findByText('2 conteneurs à surveiller')).toBeOnTheScreen();
    expect(screen.getByText('Healthcheck en échec')).toBeOnTheScreen();
    expect(screen.getByText('Arrêt anormal')).toBeOnTheScreen();

    fireEvent.press(screen.getByText('db'));
    await waitFor(() => expect(screen).toHavePathname('/endpoints/1/containers/db'));
  });

  it('says so when everything runs fine', async () => {
    jest.mocked(listContainers).mockResolvedValue([web]);
    renderOverview();
    expect(await screen.findByText('Tout fonctionne')).toBeOnTheScreen();
  });

  it('counts containers, stacks, images and volumes, then their health', async () => {
    renderOverview();
    expect(await screen.findByText('2/3')).toBeOnTheScreen();
    expect(await screen.findByText('1/2')).toBeOnTheScreen();
    expect(screen.getByText('1 arrêtée')).toBeOnTheScreen();
    expect(await screen.findByText('1 inutilisée')).toBeOnTheScreen();
    expect(await screen.findByText('1 inutilisé')).toBeOnTheScreen();
    expect(screen.getByLabelText('Sains : 1')).toBeOnTheScreen();
    expect(screen.getByLabelText('En mauvaise santé : 1')).toBeOnTheScreen();
    expect(screen.getByLabelText('Sans healthcheck : 1')).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('link', { name: 'Conteneurs, 2/3 en cours' }));
    await waitFor(() => expect(screen).toHavePathname('/endpoints/1'));
  });

  it('measures running containers only, against the host capacity', async () => {
    renderOverview();
    expect(await screen.findByText('60 % de 2 cœurs')).toBeOnTheScreen();
    expect(screen.getByText('2,0 Go / 4,0 Go')).toBeOnTheScreen();
    expect(fetchContainerStats).toHaveBeenCalledTimes(2);
    expect(fetchContainerStats).not.toHaveBeenCalledWith(expect.anything(), 1, 'worker');
    // Heaviest first.
    const names = screen.getAllByText(/^(web|db)$/).map((node) => node.props.children as string);
    expect(names.slice(-2)).toEqual(['db', 'web']);
  });

  it('breaks down disk usage and what a cleanup would free', async () => {
    renderOverview();
    expect(await screen.findByText('5,0 Go')).toBeOnTheScreen();
    expect(screen.getByText('Cache de build')).toBeOnTheScreen();
    expect(screen.getByText(/1,0 Go récupérables/)).toBeOnTheScreen();
  });

  it('explains why updates are unknown without the registry check', async () => {
    renderOverview();
    expect(await screen.findByText(/Portainer ne compare pas les images/)).toBeOnTheScreen();
    expect(fetchImageStatus).not.toHaveBeenCalled();
  });

  it('counts outdated images once each, and links to them', async () => {
    const replica = makeContainer({ Id: 'db2', Names: ['/db2'], ImageID: 'sha256:pg' });
    jest.mocked(listContainers).mockResolvedValue([web, db, replica]);
    jest
      .mocked(listEndpoints)
      .mockResolvedValue([makeEndpoint({ Id: 1, EnableImageNotification: true })]);
    jest
      .mocked(fetchImageStatus)
      .mockImplementation((_session, _endpoint, id) =>
        Promise.resolve(id === 'web' ? 'updated' : 'outdated'),
      );
    renderOverview();

    fireEvent.press(await screen.findByRole('link', { name: '1 image à mettre à jour' }));
    await waitFor(() => expect(screen).toHavePathname('/endpoints/1/images'));
    expect(screen).toHaveSearchParams({ endpointId: '1', filter: 'outdated' });
  });

  it('says when every image is up to date', async () => {
    jest
      .mocked(listEndpoints)
      .mockResolvedValue([makeEndpoint({ Id: 1, EnableImageNotification: true })]);
    jest.mocked(fetchImageStatus).mockResolvedValue('updated');
    renderOverview();
    expect(await screen.findByText('Toutes les images sont à jour')).toBeOnTheScreen();
  });
});
