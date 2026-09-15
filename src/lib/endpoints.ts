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

/** Un environnement dont l'application sait afficher les conteneurs. */
export function isBrowsable(endpoint: Endpoint): boolean {
  return isOnline(endpoint) && !isKubernetes(endpoint);
}

/**
 * Environnement ouvert à l'arrivée : le dernier consulté s'il est encore
 * accessible, sinon le premier qui le soit. `undefined` si aucun ne l'est.
 */
export function pickHomeEndpoint(
  endpoints: readonly Endpoint[],
  preferredId: number | null,
): Endpoint | undefined {
  const browsable = endpoints.filter(isBrowsable);
  return browsable.find((endpoint) => endpoint.Id === preferredId) ?? browsable[0];
}
