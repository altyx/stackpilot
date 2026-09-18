import { normalizeBaseUrl, request, requestAnonymous, requestText, PortainerError } from './client';
import type {
  ContainerAction,
  ContainerInspect,
  ContainerSummary,
  Endpoint,
  ImageSummary,
  PortainerStatus,
  Session,
  VolumeListResponse,
  VolumeSummary,
} from './types';

/** Public ping: confirms a Portainer instance responds at this URL. */
export function fetchStatus(baseUrl: string): Promise<PortainerStatus> {
  return requestAnonymous<PortainerStatus>(normalizeBaseUrl(baseUrl), { path: '/status' });
}

/** Exchanges credentials for a JWT (valid ~8h on Portainer's side). */
export async function loginWithPassword(
  rawBaseUrl: string,
  username: string,
  password: string,
): Promise<Session> {
  const baseUrl = normalizeBaseUrl(rawBaseUrl);
  const { jwt } = await requestAnonymous<{ jwt: string }>(baseUrl, {
    method: 'POST',
    path: '/auth',
    body: { username, password },
  });
  if (!jwt) throw new PortainerError('Portainer a répondu sans jeton de session.');
  return { baseUrl, mode: 'jwt', token: jwt, username };
}

/** Validates a `ptr_...` access token by calling a protected route. */
export async function loginWithApiKey(rawBaseUrl: string, token: string): Promise<Session> {
  const session: Session = { baseUrl: normalizeBaseUrl(rawBaseUrl), mode: 'apiKey', token: token.trim() };
  await listEndpoints(session);
  return session;
}

export function listEndpoints(session: Session): Promise<Endpoint[]> {
  return request<Endpoint[]>(session, { path: '/endpoints' });
}

export function getEndpoint(session: Session, endpointId: number): Promise<Endpoint> {
  return request<Endpoint>(session, { path: `/endpoints/${endpointId}` });
}

/**
 * Prefix of the Docker proxy Portainer exposes for an environment.
 * Portainer responds with "invalid environment identifier route variable" for
 * a non-integer id: caught here to point at the real cause.
 */
function docker(endpointId: number, path: string): string {
  if (!Number.isInteger(endpointId)) {
    throw new PortainerError(
      `Identifiant d'environnement invalide (${String(endpointId)}).`,
    );
  }
  return `/endpoints/${endpointId}/docker${path}`;
}

export function listContainers(session: Session, endpointId: number): Promise<ContainerSummary[]> {
  return request<ContainerSummary[]>(session, {
    path: docker(endpointId, '/containers/json'),
    query: { all: true },
  });
}

export function listImages(session: Session, endpointId: number): Promise<ImageSummary[]> {
  return request<ImageSummary[]>(session, {
    path: docker(endpointId, '/images/json'),
  });
}

export async function listVolumes(session: Session, endpointId: number): Promise<VolumeSummary[]> {
  // Docker responds with `{ Volumes: null }` rather than an empty list when there are none.
  const response = await request<VolumeListResponse>(session, {
    path: docker(endpointId, '/volumes'),
  });
  return response.Volumes ?? [];
}

export function inspectContainer(
  session: Session,
  endpointId: number,
  containerId: string,
): Promise<ContainerInspect> {
  return request<ContainerInspect>(session, {
    path: docker(endpointId, `/containers/${containerId}/json`),
  });
}

export function runContainerAction(
  session: Session,
  endpointId: number,
  containerId: string,
  action: ContainerAction,
): Promise<void> {
  return request<void>(session, {
    method: 'POST',
    path: docker(endpointId, `/containers/${containerId}/${action}`),
    timeoutMs: 30_000,
    // Docker responds 304 when the container is already in the target state.
    // On a stack action, half the containers can be in that case: it's a
    // success, not an error.
    accept: [304],
  });
}

export async function fetchContainerLogs(
  session: Session,
  endpointId: number,
  containerId: string,
  tail = 200,
): Promise<string> {
  const raw = await requestText(session, {
    path: docker(endpointId, `/containers/${containerId}/logs`),
    query: { stdout: 1, stderr: 1, timestamps: 0, tail },
    timeoutMs: 30_000,
  });
  return demultiplexDockerLogs(raw);
}

/**
 * Without a TTY, Docker prefixes each log block with an 8-byte header
 * (1 stream byte, 3 padding, 4 big-endian size). Stripped here to keep only
 * the text.
 */
export function demultiplexDockerLogs(raw: string): string {
  const looksMultiplexed = raw.length > 8 && raw.charCodeAt(0) <= 2 && raw.charCodeAt(1) === 0;
  if (!looksMultiplexed) return raw;

  const chunks: string[] = [];
  let cursor = 0;
  while (cursor + 8 <= raw.length) {
    const size =
      (raw.charCodeAt(cursor + 4) << 24) |
      (raw.charCodeAt(cursor + 5) << 16) |
      (raw.charCodeAt(cursor + 6) << 8) |
      raw.charCodeAt(cursor + 7);
    if (size < 0 || size > raw.length - cursor - 8) break;
    chunks.push(raw.slice(cursor + 8, cursor + 8 + size));
    cursor += 8 + size;
  }
  return chunks.length ? chunks.join('') : raw;
}
