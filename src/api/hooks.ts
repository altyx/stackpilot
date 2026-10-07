import { useEffect } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { useSettings } from '../settings/SettingsContext';
import {
  fetchContainerLogs,
  fetchContainerStats,
  fetchDiskUsage,
  fetchDockerInfo,
  fetchImageStatus,
  fetchStackFile,
  inspectContainer,
  listContainers,
  listEndpoints,
  listImages,
  listStacks,
  listVolumes,
  pruneImages,
  pruneVolumes,
  recreateContainer,
  redeployStack,
  removeContainer,
  removeImage,
  removeVolume,
  runContainerAction,
} from './portainer';
import { PortainerError } from './client';
import { mapSettled } from '../lib/concurrency';
import { containerName } from '../lib/format';
import { mergeLogLines, sinceParam, type LogLine, type LogRange } from '../lib/logs';
import type {
  ContainerAction,
  ContainerInspect,
  ContainerStatsResponse,
  ContainerSummary,
  Endpoint,
  PortainerStack,
  StackEnv,
  ImagePruneScope,
  VolumePruneScope,
  Session,
  StackAction,
} from './types';

/**
 * The session drops to null during sign-out, while screens are still
 * mounted. Queries are disabled rather than throwing at render time:
 * `enabled` guarantees `queryFn` never runs without a session, and this guard
 * only serves to type that case.
 */
function requireSession(session: Session | null): Session {
  if (!session) throw new PortainerError('Session expirée. Reconnectez-vous.');
  return session;
}

export const queryKeys = {
  endpoints: ['endpoints'] as const,
  containers: (endpointId: number) => ['containers', endpointId] as const,
  container: (endpointId: number, containerId: string) =>
    ['container', endpointId, containerId] as const,
  logs: (endpointId: number, containerId: string, rangeKey?: string) =>
    rangeKey === undefined
      ? (['logs', endpointId, containerId] as const)
      : (['logs', endpointId, containerId, rangeKey] as const),
  imageStatus: (endpointId: number, containerId: string) =>
    ['imageStatus', endpointId, containerId] as const,
  images: (endpointId: number) => ['images', endpointId] as const,
  volumes: (endpointId: number) => ['volumes', endpointId] as const,
  stacks: (endpointId: number) => ['stacks', endpointId] as const,
  stackFile: (stackId: number) => ['stackFile', stackId] as const,
  dockerInfo: (endpointId: number) => ['dockerInfo', endpointId] as const,
  diskUsage: (endpointId: number) => ['diskUsage', endpointId] as const,
  containerStats: (endpointId: number, containerIds: string) =>
    ['containerStats', endpointId, containerIds] as const,
};

export function useEndpoints() {
  const { session } = useAuth();
  return useQuery({
    queryKey: queryKeys.endpoints,
    queryFn: () => listEndpoints(requireSession(session)),
    enabled: !!session,
  });
}

/**
 * Whether Portainer compares this environment's images with their registry.
 * Read from the environment list rather than a dedicated call: the list is
 * already loaded, and the flag is absent (falsy) on Community Edition, where
 * the status route doesn't exist.
 */
export function useImageIndicatorEnabled(endpointId: number): boolean {
  const { session } = useAuth();
  const { data } = useQuery({
    queryKey: queryKeys.endpoints,
    queryFn: () => listEndpoints(requireSession(session)),
    enabled: !!session,
    select: (endpoints: Endpoint[]) =>
      endpoints.find((endpoint) => endpoint.Id === endpointId)?.EnableImageNotification === true,
  });
  return data === true;
}

export function useContainers(endpointId: number) {
  const { session } = useAuth();
  // Images and volumes also read this query: the interval set in settings
  // therefore applies to all three screens.
  const { settings } = useSettings();
  return useQuery({
    queryKey: queryKeys.containers(endpointId),
    queryFn: () => listContainers(requireSession(session), endpointId),
    enabled: !!session,
    refetchInterval: settings.refreshIntervalMs ?? false,
  });
}

export function useImages(endpointId: number) {
  const { session } = useAuth();
  return useQuery({
    queryKey: queryKeys.images(endpointId),
    queryFn: () => listImages(requireSession(session), endpointId),
    enabled: !!session,
  });
}

export function useVolumes(endpointId: number) {
  const { session } = useAuth();
  return useQuery({
    queryKey: queryKeys.volumes(endpointId),
    queryFn: () => listVolumes(requireSession(session), endpointId),
    enabled: !!session,
  });
}

export function useStacks(endpointId: number) {
  const { session } = useAuth();
  return useQuery({
    queryKey: queryKeys.stacks(endpointId),
    queryFn: () => listStacks(requireSession(session), endpointId),
    enabled: !!session,
  });
}

export function useStackFile(stackId: number | null) {
  const { session } = useAuth();
  return useQuery({
    queryKey: queryKeys.stackFile(stackId ?? 0),
    queryFn: () => fetchStackFile(requireSession(session), stackId ?? 0),
    enabled: !!session && stackId !== null,
  });
}

export function useContainer(endpointId: number, containerId: string) {
  const { session } = useAuth();
  return useQuery({
    queryKey: queryKeys.container(endpointId, containerId),
    queryFn: () => inspectContainer(requireSession(session), endpointId, containerId),
    enabled: !!session,
  });
}

export function useImageStatus(endpointId: number, containerId: string) {
  const { session } = useAuth();
  const enabled = useImageIndicatorEnabled(endpointId);
  return useQuery({
    queryKey: queryKeys.imageStatus(endpointId, containerId),
    queryFn: () => fetchImageStatus(requireSession(session), endpointId, containerId),
    enabled: !!session && enabled,
    // Portainer caches the registry check on its side; asking again on every
    // list refresh would only add a request per container.
    staleTime: 10 * 60_000,
    // A failure means the indicator is unavailable for this container, not a
    // transient error worth hammering the registry for.
    retry: false,
  });
}

export function useRemoveImage(endpointId: number) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ imageId, force }: { imageId: string; force: boolean }) =>
      removeImage(requireSession(session), endpointId, imageId, force),
    onSettled: () => {
      // Refetched even on failure: a 409 often means the list was stale.
      void queryClient.invalidateQueries({ queryKey: queryKeys.images(endpointId) });
    },
  });
}

export function usePruneImages(endpointId: number) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scope: ImagePruneScope) => pruneImages(requireSession(session), endpointId, scope),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.images(endpointId) });
    },
  });
}

export function useRemoveVolume(endpointId: number) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => removeVolume(requireSession(session), endpointId, name),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.volumes(endpointId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.diskUsage(endpointId) });
    },
  });
}

export function usePruneVolumes(endpointId: number) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scope: VolumePruneScope) =>
      pruneVolumes(requireSession(session), endpointId, scope),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.volumes(endpointId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.diskUsage(endpointId) });
    },
  });
}

export function useDockerInfo(endpointId: number) {
  const { session } = useAuth();
  return useQuery({
    queryKey: queryKeys.dockerInfo(endpointId),
    queryFn: () => fetchDockerInfo(requireSession(session), endpointId),
    enabled: !!session,
    // CPU count and memory only change when the host does.
    staleTime: 60 * 60_000,
  });
}

export function useDiskUsage(endpointId: number) {
  const { session } = useAuth();
  return useQuery({
    queryKey: queryKeys.diskUsage(endpointId),
    queryFn: () => fetchDiskUsage(requireSession(session), endpointId),
    enabled: !!session,
    // Costly for Docker to compute, and slow to change: refreshed on demand.
    staleTime: 5 * 60_000,
  });
}

/** Above this, Docker spends its time sampling and the host feels it. */
const STATS_CONCURRENCY = 4;

/**
 * One stats reading per running container. Keyed by the set of containers,
 * so a container starting or stopping triggers a new reading.
 */
export function useContainerStats(endpointId: number, containers: ContainerSummary[]) {
  const { session } = useAuth();
  const ids = containers
    .map((container) => container.Id)
    .sort()
    .join(',');
  return useQuery({
    queryKey: queryKeys.containerStats(endpointId, ids),
    queryFn: async () => {
      const readings = await mapSettled(containers, STATS_CONCURRENCY, (container) =>
        fetchContainerStats(requireSession(session), endpointId, container.Id),
      );
      return containers.flatMap((container, index) => {
        const stats: ContainerStatsResponse | null = readings[index];
        return stats ? [{ container, stats }] : [];
      });
    },
    enabled: !!session && containers.length > 0,
    staleTime: 30_000,
  });
}

/**
 * Image status of each given container, sharing its cache with the
 * indicator in the container list. Empty when the environment doesn't
 * compare images with their registry (Community Edition, or disabled).
 */
export function useImageUpdates(endpointId: number, containers: ContainerSummary[]) {
  const { session } = useAuth();
  const enabled = useImageIndicatorEnabled(endpointId);
  return useQueries({
    queries: containers.map((container) => ({
      queryKey: queryKeys.imageStatus(endpointId, container.Id),
      queryFn: () => fetchImageStatus(requireSession(session), endpointId, container.Id),
      enabled: !!session && enabled,
      staleTime: 10 * 60_000,
      retry: false,
    })),
    combine: (results) => {
      const outdated = containers.filter((_container, index) => results[index].data === 'outdated');
      return {
        enabled,
        isPending: enabled && results.some((result) => result.isPending),
        outdated,
        // Several containers often run the same image: it's updated once.
        outdatedImageIds: [...new Set(outdated.map((container) => container.ImageID))],
      };
    },
  });
}

/**
 * Recreates a container, pulling its image first: Portainer's way of
 * updating it. The mutation resolves with the new container, whose id
 * differs from the old one: the caller navigates to it.
 */
export function useRecreateContainer(endpointId: number, containerId: string) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pullImage }: { pullImage: boolean }) =>
      recreateContainer(requireSession(session), endpointId, containerId, pullImage),
    onSuccess: (created: ContainerInspect) => {
      // The new container's screen opens on data already in hand, and the
      // list stops showing the removed one.
      queryClient.setQueryData(queryKeys.container(endpointId, created.Id), created);
      void queryClient.invalidateQueries({ queryKey: queryKeys.containers(endpointId) });
      queryClient.removeQueries({ queryKey: queryKeys.imageStatus(endpointId, containerId) });
    },
  });
}

/** Pace of the live follow: frequent enough to read along, light on the host. */
export const LOG_FOLLOW_INTERVAL_MS = 2000;

/**
 * Logs of a container over a range, optionally followed live. Following
 * polls for the lines after the last one shown and appends them to the
 * cached list, rather than holding a streaming connection: React Native's
 * fetch has no streaming body, and a poll survives Portainer's proxy and a
 * flaky mobile network alike.
 */
export function useContainerLogs(
  endpointId: number,
  containerId: string,
  range: LogRange,
  { enabled, follow }: { enabled: boolean; follow: boolean },
) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.logs(endpointId, containerId, range.key);

  const query = useQuery({
    queryKey,
    queryFn: () =>
      fetchContainerLogs(requireSession(session), endpointId, containerId, {
        tail: range.tail,
        since: range.sinceSeconds
          ? String(Math.floor(Date.now() / 1000) - range.sinceSeconds)
          : undefined,
      }),
    enabled: !!session && enabled,
    // While following, the poll keeps the list current: a background refetch
    // would only throw the appended lines away.
    staleTime: follow ? Infinity : 0,
  });

  const ready = query.isSuccess;
  useEffect(() => {
    if (!follow || !session || !ready) return;
    const key = queryKeys.logs(endpointId, containerId, range.key);
    let polling = false;
    const timer = setInterval(() => {
      if (polling) return;
      polling = true;
      const last = queryClient.getQueryData<LogLine[]>(key)?.at(-1)?.timestamp;
      fetchContainerLogs(session, endpointId, containerId, {
        since: last ? sinceParam(last) : undefined,
        tail: last ? undefined : range.tail,
      })
        .then((incoming) =>
          queryClient.setQueryData<LogLine[]>(key, (current) =>
            mergeLogLines(current ?? [], incoming),
          ),
        )
        // A missed poll is caught up by the next one, which asks from the
        // same last line: no need to interrupt the reading for it.
        .catch(() => undefined)
        .finally(() => {
          polling = false;
        });
    }, LOG_FOLLOW_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [follow, session, ready, queryClient, endpointId, containerId, range.key, range.tail]);

  return query;
}

export function useContainerAction(endpointId: number, containerId: string) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: ContainerAction) =>
      runContainerAction(requireSession(session), endpointId, containerId, action),
    onSuccess: () => {
      // Docker applies the action asynchronously: we re-read the state afterward.
      void queryClient.invalidateQueries({ queryKey: queryKeys.containers(endpointId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.container(endpointId, containerId),
      });
    },
  });
}

export function useRedeployStack(endpointId: number) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      stack,
      pullImages,
      env,
    }: {
      stack: PortainerStack;
      pullImages: boolean;
      env?: StackEnv[];
    }) => redeployStack(requireSession(session), stack, { pullImages, env }),
    onSettled: (_data, _error, { stack }) => {
      // Recreated containers get new ids; a Git redeploy may change the file.
      void queryClient.invalidateQueries({ queryKey: queryKeys.stacks(endpointId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.containers(endpointId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.stackFile(stack.Id) });
    },
  });
}

export function useRemoveContainer(endpointId: number, containerId: string) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (options: { force: boolean; removeVolumes: boolean }) =>
      removeContainer(requireSession(session), endpointId, containerId, options),
    onSuccess: () => {
      // The screen leaves right after: nothing should refetch a container
      // that no longer exists.
      queryClient.removeQueries({ queryKey: queryKeys.container(endpointId, containerId) });
      queryClient.removeQueries({ queryKey: queryKeys.logs(endpointId, containerId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.containers(endpointId) });
    },
  });
}

export interface StackActionResult {
  succeeded: number;
  failures: { name: string; message: string }[];
}

/**
 * Applies an action to every container in a stack.
 *
 * Portainer does expose `/api/stacks/{id}/start`, but that route only covers
 * stacks it manages itself and depends on separate permissions. Since the
 * app's grouping comes from Docker labels, we act here container by
 * container: it works for any group shown, with only the permissions already
 * required for single-container actions.
 *
 * Sequential and deliberately tolerant: a failing container doesn't stop the
 * rest, and the failure detail bubbles up to the caller.
 */
export function useStackAction(endpointId: number) {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      containers,
      action,
    }: {
      containers: ContainerSummary[];
      action: StackAction;
    }): Promise<StackActionResult> => {
      const failures: StackActionResult['failures'] = [];
      let succeeded = 0;

      for (const container of containers) {
        try {
          await runContainerAction(requireSession(session), endpointId, container.Id, action);
          succeeded += 1;
        } catch (error) {
          failures.push({
            name: containerName(container),
            message: error instanceof Error ? error.message : 'Erreur inconnue.',
          });
        }
      }

      return { succeeded, failures };
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.containers(endpointId) });
    },
  });
}
