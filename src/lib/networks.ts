import type { ContainerSummary, NetworkSummary } from '../api/types';
import { containerName } from './format';
import type { Usage } from './usage';

/** Networks every Docker engine creates on its own; they cannot be deleted. */
const PREDEFINED = new Set(['bridge', 'host', 'none']);

export function isPredefinedNetwork(network: NetworkSummary): boolean {
  return PREDEFINED.has(network.Name);
}

/**
 * `GET /networks` leaves `Containers` empty (only the inspect fills it), so
 * attachments come from the container list, stopped containers included.
 */
export function networksWithUsage(
  networks: NetworkSummary[],
  containers: ContainerSummary[],
): Usage<NetworkSummary>[] {
  const byNetworkId = new Map<string, Set<string>>();
  const byName = new Map<string, Set<string>>();

  for (const container of containers) {
    const name = containerName(container);
    for (const [networkName, attachment] of Object.entries(
      container.NetworkSettings?.Networks ?? {},
    )) {
      // A stopped container may keep an empty NetworkID: the name is the fallback.
      add(attachment.NetworkID ? byNetworkId : byName, attachment.NetworkID || networkName, name);
    }
  }

  return networks
    .map((network) => ({
      item: network,
      usedBy: [
        ...new Set([...(byNetworkId.get(network.Id) ?? []), ...(byName.get(network.Name) ?? [])]),
      ].sort(),
    }))
    .sort((a, b) => a.item.Name.localeCompare(b.item.Name));
}

export function networkSubnets(network: NetworkSummary): string[] {
  return (network.IPAM?.Config ?? []).flatMap((config) => (config.Subnet ? [config.Subnet] : []));
}

/** Case-insensitive match on the name, driver or a subnet. */
export function matchesNetworkSearch(network: NetworkSummary, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return [network.Name, network.Driver, ...networkSubnets(network)].some((value) =>
    value.toLowerCase().includes(needle),
  );
}

function add(map: Map<string, Set<string>>, key: string, value: string) {
  const set = map.get(key) ?? new Set<string>();
  set.add(value);
  map.set(key, set);
}
