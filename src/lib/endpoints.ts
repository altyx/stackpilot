import { EndpointType, type Endpoint } from '../api/types';

const KUBERNETES_TYPES: ReadonlySet<EndpointType> = new Set([
  EndpointType.KubernetesLocal,
  EndpointType.KubernetesAgent,
  EndpointType.KubernetesEdgeAgent,
]);

export function isKubernetes(endpoint: Endpoint): boolean {
  return KUBERNETES_TYPES.has(endpoint.Type);
}

export function isOnline(endpoint: Endpoint): boolean {
  return endpoint.Status === 1;
}

/** An environment the app knows how to display containers for. */
export function isBrowsable(endpoint: Endpoint): boolean {
  return isOnline(endpoint) && !isKubernetes(endpoint);
}

/**
 * Environment opened on arrival: the last one viewed if still reachable,
 * otherwise the first reachable one. `undefined` if none are.
 */
export function pickHomeEndpoint(
  endpoints: readonly Endpoint[],
  preferredId: number | null,
): Endpoint | undefined {
  const browsable = endpoints.filter(isBrowsable);
  return browsable.find((endpoint) => endpoint.Id === preferredId) ?? browsable[0];
}
