import type { ContainerInspect } from '../api/types';

export type SecondaryAction = 'pause' | 'unpause' | 'kill' | 'remove';

/**
 * Actions kept out of the main buttons, for the container's current state.
 * Portainer's own container gets none: killing or deleting it would cut the
 * API off mid-request, and pausing it freezes the app's only way back.
 */
export function secondaryActions(container: ContainerInspect): SecondaryAction[] {
  if (container.IsPortainer) return [];
  const { Running, Paused } = container.State;
  const actions: SecondaryAction[] = [];
  if (Paused) actions.push('unpause');
  else if (Running) actions.push('pause');
  if (Running) actions.push('kill');
  actions.push('remove');
  return actions;
}

/** Whether the container mounts volumes a removal could take with it. */
export function hasVolumeMounts(container: ContainerInspect): boolean {
  return container.Mounts.some((mount) => mount.Type === 'volume');
}
