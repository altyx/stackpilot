import { makeContainer, makeNetwork } from '../testing/fixtures';
import {
  isPredefinedNetwork,
  matchesNetworkSearch,
  networkSubnets,
  networksWithUsage,
} from './networks';

describe('networksWithUsage', () => {
  it('lists attached containers by network id, falling back on the name', () => {
    const app = makeNetwork({ Id: 'n1', Name: 'app_default' });
    const bridge = makeNetwork({ Id: 'n2', Name: 'bridge' });
    const usages = networksWithUsage(
      [app, bridge],
      [
        makeContainer({
          Names: ['/web'],
          NetworkSettings: { Networks: { app_default: { NetworkID: 'n1' } } },
        }),
        makeContainer({
          Names: ['/db'],
          NetworkSettings: { Networks: { app_default: { NetworkID: '' } } },
        }),
        makeContainer({ Names: ['/legacy'] }),
      ],
    );
    expect(usages.map((usage) => [usage.item.Name, usage.usedBy])).toEqual([
      ['app_default', ['db', 'web']],
      ['bridge', []],
    ]);
  });
});

describe('networkSubnets', () => {
  it('skips IPAM entries without a subnet', () => {
    expect(
      networkSubnets(
        makeNetwork({ IPAM: { Config: [{ Subnet: '10.0.0.0/24' }, { Gateway: 'x' }] } }),
      ),
    ).toEqual(['10.0.0.0/24']);
    expect(networkSubnets(makeNetwork({ IPAM: null }))).toEqual([]);
  });
});

describe('matchesNetworkSearch', () => {
  const network = makeNetwork({ Name: 'Traefik_Public', Driver: 'overlay' });

  it('matches the name, driver or subnet regardless of case', () => {
    expect(matchesNetworkSearch(network, 'traefik')).toBe(true);
    expect(matchesNetworkSearch(network, ' OVERLAY ')).toBe(true);
    expect(matchesNetworkSearch(network, '172.18')).toBe(true);
    expect(matchesNetworkSearch(network, 'macvlan')).toBe(false);
    expect(matchesNetworkSearch(network, '   ')).toBe(true);
  });
});

describe('isPredefinedNetwork', () => {
  it('flags the networks Docker creates itself', () => {
    expect(isPredefinedNetwork(makeNetwork({ Name: 'host' }))).toBe(true);
    expect(isPredefinedNetwork(makeNetwork({ Name: 'app_default' }))).toBe(false);
  });
});
