import { normalizeBaseUrl, request, requestAnonymous, requestText, PortainerError } from './client';
import type {
  ContainerAction,
  ContainerInspect,
  ContainerSummary,
  Endpoint,
  ImageDeleteItem,
  ImagePruneResponse,
  ImagePruneResult,
  ImagePruneScope,
  ImageStatus,
  ImageStatusResponse,
  ImageSummary,
  PortainerStack,
  PortainerStatus,
  Session,
  StackFile,
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
  const session: Session = {
    baseUrl: normalizeBaseUrl(rawBaseUrl),
    mode: 'apiKey',
    token: token.trim(),
  };
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
 * Portainer responds with "invalid environment identifier route variable" for
 * a non-integer id: caught here to point at the real cause.
 */
function assertEndpointId(endpointId: number): void {
  if (!Number.isInteger(endpointId)) {
    throw new PortainerError(`Identifiant d'environnement invalide (${String(endpointId)}).`);
  }
}

/** Prefix of the Docker proxy Portainer exposes for an environment. */
function docker(endpointId: number, path: string): string {
  assertEndpointId(endpointId);
  return `/endpoints/${endpointId}/docker${path}`;
}

/**
 * Prefix of the routes Portainer serves itself for an environment, on top of
 * Docker: image status, container recreation.
 */
function portainerDocker(endpointId: number, path: string): string {
  assertEndpointId(endpointId);
  return `/docker/${endpointId}${path}`;
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

/**
 * Deletes an image by id. An image carrying several tags is only removed with
 * `force`: without it, Docker refuses to pick which tag to drop. Even forced,
 * Docker still refuses an image a running container uses.
 */
export async function removeImage(
  session: Session,
  endpointId: number,
  imageId: string,
  force: boolean,
): Promise<ImageDeleteItem[]> {
  try {
    return await request<ImageDeleteItem[]>(session, {
      method: 'DELETE',
      path: docker(endpointId, `/images/${encodeURIComponent(imageId)}`),
      query: { force: force || undefined },
      timeoutMs: 60_000,
    });
  } catch (error) {
    // The generic 409 message ("already in that state") misleads here: for
    // an image, a conflict means a container still depends on it.
    if (error instanceof PortainerError && error.status === 409) {
      throw new PortainerError(
        "Image utilisée : un conteneur, peut-être arrêté, en dépend encore. Supprimez-le d'abord.",
        409,
        error.detail,
      );
    }
    throw error;
  }
}

/**
 * Deletes, in one call, the images no container references: untagged ones
 * only, or all of them. Docker decides what is unused on its side, stopped
 * containers included, exactly like `docker image prune`.
 */
export async function pruneImages(
  session: Session,
  endpointId: number,
  scope: ImagePruneScope,
): Promise<ImagePruneResult> {
  const response = await request<ImagePruneResponse>(session, {
    method: 'POST',
    path: docker(endpointId, '/images/prune'),
    query: { filters: JSON.stringify({ dangling: [scope === 'dangling' ? 'true' : 'false'] }) },
    // Deleting many layers on a slow disk takes a while, and aborting would
    // leave the prune running on the host anyway.
    timeoutMs: 180_000,
  });
  return {
    deleted: response?.ImagesDeleted ?? [],
    spaceReclaimed: response?.SpaceReclaimed ?? 0,
  };
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

/**
 * Stacks Portainer manages on an environment.
 *
 * Filtered here rather than through the route's `filters` parameter: that
 * one matches Swarm stacks by Swarm id, not by environment, and would need a
 * second call to learn it. Portainer answers 204 rather than `[]` when the
 * account has no stack.
 */
export async function listStacks(session: Session, endpointId: number): Promise<PortainerStack[]> {
  assertEndpointId(endpointId);
  const stacks = await request<PortainerStack[] | undefined>(session, { path: '/stacks' });
  return (stacks ?? []).filter((stack) => stack.EndpointId === endpointId);
}

/** Compose file of a stack, as Portainer stores it. */
export async function fetchStackFile(session: Session, stackId: number): Promise<string> {
  const file = await request<StackFile>(session, { path: `/stacks/${stackId}/file` });
  return file.StackFileContent;
}

/**
 * Compares the container's image with its registry, through Portainer's
 * "image up to date indicator". The route only exists in Business Edition,
 * and only answers when the indicator is enabled on the environment: callers
 * check `Endpoint.EnableImageNotification` before asking.
 */
export async function fetchImageStatus(
  session: Session,
  endpointId: number,
  containerId: string,
): Promise<ImageStatus> {
  const response = await request<ImageStatusResponse>(session, {
    path: portainerDocker(endpointId, `/containers/${containerId}/image_status`),
    // Portainer queries the registry on a cache miss, which can be slow.
    timeoutMs: 30_000,
  });
  return normalizeImageStatus(response?.Status);
}

/** Portainer's web UI has used both spellings for the in-progress state. */
export function normalizeImageStatus(status: string | undefined): ImageStatus {
  switch (status) {
    case 'updated':
    case 'outdated':
      return status;
    case 'processing':
    case 'inprocess':
      return 'processing';
    default:
      return 'unknown';
  }
}

/**
 * Removes the container and creates it again with the same configuration,
 * optionally pulling its image first: this is how Portainer updates a
 * container to a newer image. The new container gets a new id, returned
 * here, and everything not persisted in a volume is lost.
 */
export function recreateContainer(
  session: Session,
  endpointId: number,
  containerId: string,
  pullImage: boolean,
): Promise<ContainerInspect> {
  return request<ContainerInspect>(session, {
    method: 'POST',
    path: portainerDocker(endpointId, `/containers/${containerId}/recreate`),
    body: { PullImage: pullImage },
    // Portainer pulls the image synchronously: a large image on a slow link
    // takes minutes, and a timeout here would abandon a recreation in progress.
    timeoutMs: 300_000,
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
