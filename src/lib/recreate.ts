import type { ContainerInspect } from '../api/types';

/** Label Docker sets on the tasks of a Swarm service. */
const SWARM_SERVICE_ID = 'com.docker.swarm.service.id';

/**
 * Why updating a container's image (recreate with pull) isn't offered, or
 * null when it is. Same rules as Portainer's "Recreate" button, whose
 * absence is otherwise silent.
 */
export function imageUpdateBlocker(container: ContainerInspect): string | null {
  if (container.IsPortainer) {
    return 'Portainer cannot recreate its own container: update it from the host.';
  }
  if (container.Config.Labels?.[SWARM_SERVICE_ID]) {
    return 'This container belongs to a Swarm service: update the service instead.';
  }
  if (container.HostConfig.AutoRemove) {
    return 'This container removes itself when it stops (--rm): it cannot be recreated.';
  }
  if (!container.Config.Image || container.Config.Image.toLowerCase().startsWith('sha256')) {
    return 'The image has no tag: there is nothing to pull from a registry.';
  }
  return null;
}
