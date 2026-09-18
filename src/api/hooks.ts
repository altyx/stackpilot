import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { useSettings } from '../settings/SettingsContext';
import {
  fetchContainerLogs,
  inspectContainer,
  listContainers,
  listEndpoints,
  listImages,
  listVolumes,
  runContainerAction,
} from './portainer';
import { PortainerError } from './client';
import { containerName } from '../lib/format';
import type { ContainerAction, ContainerSummary, Session, StackAction } from './types';

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
  logs: (endpointId: number, containerId: string) => ['logs', endpointId, containerId] as const,
  images: (endpointId: number) => ['images', endpointId] as const,
  volumes: (endpointId: number) => ['volumes', endpointId] as const,
};

export function useEndpoints() {
  const { session } = useAuth();
  return useQuery({
    queryKey: queryKeys.endpoints,
    queryFn: () => listEndpoints(requireSession(session)),
    enabled: !!session,
  });
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

export function useContainer(endpointId: number, containerId: string) {
  const { session } = useAuth();
  return useQuery({
    queryKey: queryKeys.container(endpointId, containerId),
    queryFn: () => inspectContainer(requireSession(session), endpointId, containerId),
    enabled: !!session,
  });
}

export function useContainerLogs(endpointId: number, containerId: string, tail = 200) {
  const { session } = useAuth();
  return useQuery({
    queryKey: queryKeys.logs(endpointId, containerId),
    queryFn: () => fetchContainerLogs(requireSession(session), endpointId, containerId, tail),
    enabled: !!session,
  });
}

export function useContainerAction(endpointId: number, containerId: string) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: ContainerAction) =>
      runContainerAction(requireSession(session), endpointId, containerId, action),
    onSuccess: () => {
      // Docker applies the action asynchronously: we re-read the state afterward.
      queryClient.invalidateQueries({ queryKey: queryKeys.containers(endpointId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.container(endpointId, containerId) });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.containers(endpointId) });
    },
  });
}
