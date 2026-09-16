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
 * La session tombe à null pendant la déconnexion, alors que les écrans sont
 * encore montés. Les requêtes sont donc désactivées plutôt que de lever une
 * exception au rendu : `enabled` garantit que `queryFn` ne s'exécute pas sans
 * session, et ce garde-fou ne sert qu'à typer le cas.
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
  // Les images et les volumes lisent aussi cette requête : l'intervalle réglé
  // dans les réglages vaut donc pour les trois écrans.
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
      // Docker applique l'action de façon asynchrone : on relit l'état après coup.
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
 * Applique une action à tous les conteneurs d'une stack.
 *
 * Portainer expose bien `/api/stacks/{id}/start`, mais cette route ne couvre
 * que les stacks qu'il gère lui-même et dépend de droits distincts. Le
 * regroupement de l'app venant des labels Docker, on agit ici conteneur par
 * conteneur : ça marche pour tout groupe affiché, avec les seuls droits déjà
 * nécessaires aux actions unitaires.
 *
 * Séquentiel et volontairement tolérant : un conteneur en échec n'interrompt
 * pas les suivants, et le détail des échecs remonte à l'appelant.
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
