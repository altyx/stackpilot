import { normalizeBaseUrl, request, requestAnonymous, requestText, PortainerError } from './client';
import { parseLogLines, stripFrameHeaders, type LogLine } from '../lib/logs';
import type {
  ContainerAction,
  ContainerInspect,
  ContainerStatsResponse,
  ContainerSummary,
  DiskUsageResponse,
  DockerInfo,
  Endpoint,
  ImageDeleteItem,
  ImagePruneResponse,
  ImagePruneResult,
  ImagePruneScope,
  ImageStatus,
  ImageStatusResponse,
  ImageSummary,
  PortainerStack,
  StackEnv,
  PortainerStatus,
  Session,
  StackFile,
  VolumeListResponse,
  VolumePruneResponse,
  VolumePruneResult,
  VolumePruneScope,
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

/** Host the environment runs on: CPU count and memory, to scale container usage. */
export function fetchDockerInfo(session: Session, endpointId: number): Promise<DockerInfo> {
  return request<DockerInfo>(session, { path: docker(endpointId, '/info') });
}

/**
 * Disk space Docker uses, by category. Docker walks every layer and volume
 * to answer, which takes seconds on a busy host: callers cache it.
 */
export function fetchDiskUsage(session: Session, endpointId: number): Promise<DiskUsageResponse> {
  return request<DiskUsageResponse>(session, {
    path: docker(endpointId, '/system/df'),
    timeoutMs: 60_000,
  });
}

/**
 * One reading of a container's resource usage. Without `one-shot`, Docker
 * waits for a second sample (about a second) so the CPU delta can be computed.
 */
export function fetchContainerStats(
  session: Session,
  endpointId: number,
  containerId: string,
): Promise<ContainerStatsResponse> {
  return request<ContainerStatsResponse>(session, {
    path: docker(endpointId, `/containers/${containerId}/stats`),
    query: { stream: false },
    timeoutMs: 20_000,
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

/**
 * Deletes a volume and the data it holds. Docker refuses (409) while any
 * container references it, stopped ones included: never forced here.
 */
export async function removeVolume(
  session: Session,
  endpointId: number,
  name: string,
): Promise<void> {
  try {
    await request<void>(session, {
      method: 'DELETE',
      path: docker(endpointId, `/volumes/${encodeURIComponent(name)}`),
      timeoutMs: 60_000,
    });
  } catch (error) {
    if (error instanceof PortainerError && error.status === 409) {
      throw new PortainerError(
        "Volume utilisé : un conteneur, peut-être arrêté, s'en sert encore. Supprimez-le d'abord.",
        409,
        error.detail,
      );
    }
    throw error;
  }
}

/**
 * Deletes the volumes no container references. Since Engine 23, Docker only
 * prunes anonymous volumes unless `all` is set; older engines ignore the
 * filter and prune every unused volume, which callers must account for.
 */
export async function pruneVolumes(
  session: Session,
  endpointId: number,
  scope: VolumePruneScope,
): Promise<VolumePruneResult> {
  const response = await request<VolumePruneResponse>(session, {
    method: 'POST',
    path: docker(endpointId, '/volumes/prune'),
    query: scope === 'all' ? { filters: JSON.stringify({ all: ['true'] }) } : undefined,
    timeoutMs: 180_000,
  });
  return {
    deleted: response?.VolumesDeleted ?? [],
    spaceReclaimed: response?.SpaceReclaimed ?? 0,
  };
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
 * Deletes a container. `force` stops it first when it runs; `removeVolumes`
 * also deletes its anonymous volumes, never the named ones.
 */
export function removeContainer(
  session: Session,
  endpointId: number,
  containerId: string,
  options: { force: boolean; removeVolumes: boolean },
): Promise<void> {
  return request<void>(session, {
    method: 'DELETE',
    path: docker(endpointId, `/containers/${containerId}`),
    query: { force: options.force || undefined, v: options.removeVolumes || undefined },
    timeoutMs: 60_000,
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
 * Redeploys a stack Portainer manages, optionally pulling its images again
 * and replacing its variables.
 *
 * A Git stack goes through its own route: the generic update would detach it
 * from its repository. Without credentials in the payload, Portainer keeps the
 * stored ones. The generic update needs the compose file back, unchanged.
 * Both `PullImage` (older Portainer) and `RepullImageAndRedeploy` are sent.
 */
export async function redeployStack(
  session: Session,
  stack: PortainerStack,
  options: { pullImages: boolean; env?: StackEnv[] },
): Promise<void> {
  const common = {
    Env: options.env ?? stack.Env ?? [],
    Prune: false,
    PullImage: options.pullImages,
    RepullImageAndRedeploy: options.pullImages,
  };
  // Pulling and recreating every service of a stack takes minutes on a slow link.
  const timeoutMs = 300_000;
  const query = { endpointId: stack.EndpointId };

  if (stack.GitConfig) {
    await request<void>(session, {
      method: 'PUT',
      path: `/stacks/${stack.Id}/git/redeploy`,
      query,
      body: {
        ...common,
        RepositoryReferenceName: stack.GitConfig.ReferenceName,
        RepositoryAuthentication: false,
      },
      timeoutMs,
    });
    return;
  }

  const content = await fetchStackFile(session, stack.Id);
  if (!content) {
    throw new PortainerError('Fichier de la stack vide : Portainer refuserait le redéploiement.');
  }
  await request<void>(session, {
    method: 'PUT',
    path: `/stacks/${stack.Id}`,
    query,
    body: { ...common, StackFileContent: content },
    timeoutMs,
  });
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

/**
 * Whether a stack's images are behind their registry, all services combined:
 * Portainer reports "outdated" as soon as one is. Same conditions as the
 * container route: Business Edition, indicator enabled on the environment.
 */
export async function fetchStackImageStatus(
  session: Session,
  stackId: number,
): Promise<ImageStatus> {
  const response = await request<ImageStatusResponse>(session, {
    path: `/stacks/${stackId}/images_status`,
    // One registry lookup per service on a cache miss: slower than a container.
    timeoutMs: 60_000,
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

/**
 * Log lines of a container: the last `tail` lines, or every line since a
 * Unix time. Timestamps are always requested: following the logs resumes
 * from the last one, and the screen chooses whether to show them.
 */
export async function fetchContainerLogs(
  session: Session,
  endpointId: number,
  containerId: string,
  window: { tail?: number; since?: string },
): Promise<LogLine[]> {
  const raw = await requestText(session, {
    path: docker(endpointId, `/containers/${containerId}/logs`),
    query: { stdout: 1, stderr: 1, timestamps: 1, tail: window.tail, since: window.since },
    timeoutMs: 30_000,
  });
  return parseLogLines(stripFrameHeaders(raw));
}
