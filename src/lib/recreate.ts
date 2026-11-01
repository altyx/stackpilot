import type { ContainerInspect } from '../api/types';

/** Label Docker sets on the tasks of a Swarm service. */
const SWARM_SERVICE_ID = 'com.docker.swarm.service.id';

export type UpdateBlocker = 'portainer' | 'swarm' | 'autoRemove' | 'untagged';

/**
 * Why updating a container's image (recreate with pull) isn't offered, or
 * null when it is. Same rules as Portainer's "Recreate" button, whose
 * absence is otherwise silent.
 */
export function imageUpdateBlocker(container: ContainerInspect): UpdateBlocker | null {
  if (container.IsPortainer) return 'portainer';
  if (container.Config.Labels?.[SWARM_SERVICE_ID]) return 'swarm';
  if (container.HostConfig.AutoRemove) return 'autoRemove';
  if (!container.Config.Image || container.Config.Image.toLowerCase().startsWith('sha256')) {
    return 'untagged';
  }
  return null;
}
