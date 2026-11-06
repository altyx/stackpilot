import { QueryClient } from '@tanstack/react-query';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import NetworksScreen from '../app/(drawer)/endpoints/[endpointId]/networks';
import { listContainers, listEndpoints, listNetworks } from '../src/api/portainer';
import { makeContainer, makeEndpoint, makeNetwork } from '../src/testing/fixtures';
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
  listNetworks: jest.fn(),
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const Layout = createTestLayout(queryClient);

async function renderNetworks() {
  renderRouter(
    { _layout: Layout, '(drawer)/endpoints/[endpointId]/networks': NetworksScreen },
    { initialUrl: '/endpoints/1/networks' },
  );
  await screen.findByText('app_default');
}

beforeEach(() => {
  memory.clear();
  seedSession();
  queryClient.clear();
  jest.clearAllMocks();
  jest.mocked(listEndpoints).mockResolvedValue([makeEndpoint({ Id: 1 })]);
  jest.mocked(listNetworks).mockResolvedValue([
    makeNetwork({ Id: 'n1', Name: 'app_default' }),
    makeNetwork({ Id: 'n2', Name: 'host', Driver: 'host', IPAM: { Config: [] } }),
    makeNetwork({
      Id: 'n3',
      Name: 'traefik_public',
      Driver: 'overlay',
      Scope: 'swarm',
      Attachable: true,
      IPAM: { Config: [{ Subnet: '10.0.1.0/24' }] },
    }),
  ]);
  jest.mocked(listContainers).mockResolvedValue([
    makeContainer({
      Names: ['/web'],
      NetworkSettings: { Networks: { app_default: { NetworkID: 'n1' } } },
    }),
  ]);
});

describe('networks screen', () => {
  it('lists networks with Docker values as-is and their attached containers', async () => {
    await renderNetworks();
    expect(screen.getByText('3 networks · 2 unused')).toBeOnTheScreen();
    expect(screen.getByText('bridge · local')).toBeOnTheScreen();
    expect(screen.getByText('172.18.0.0/16')).toBeOnTheScreen();
    expect(screen.getByText('web')).toBeOnTheScreen();
    expect(screen.getByText('host · local · built-in')).toBeOnTheScreen();
    expect(screen.getByText('overlay · swarm · attachable')).toBeOnTheScreen();
  });

  it('filters by name, driver or subnet', async () => {
    await renderNetworks();
    const search = screen.getByLabelText('Filter by name, driver or subnet');

    fireEvent.changeText(search, 'OVERLAY');
    expect(screen.getByText('traefik_public')).toBeOnTheScreen();
    expect(screen.queryByText('app_default')).toBeNull();

    fireEvent.changeText(search, '172.18');
    expect(screen.getByText('app_default')).toBeOnTheScreen();
    expect(screen.queryByText('traefik_public')).toBeNull();

    fireEvent.changeText(search, 'nope');
    expect(screen.getByText('No networks')).toBeOnTheScreen();
    expect(screen.getByText('Nothing matches this filter.')).toBeOnTheScreen();
  });
});
