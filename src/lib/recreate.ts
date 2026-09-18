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
    return "Portainer ne peut pas recréer son propre conteneur : mettez-le à jour depuis l'hôte.";
  }
  if (container.Config.Labels?.[SWARM_SERVICE_ID]) {
    return 'Ce conteneur appartient à un service Swarm : mettez à jour le service.';
  }
  if (container.HostConfig.AutoRemove) {
    return 'Ce conteneur se supprime à son arrêt (--rm) : il ne peut pas être recréé.';
  }
  if (!container.Config.Image || container.Config.Image.toLowerCase().startsWith('sha256')) {
    return "L'image n'a pas de tag : rien à télécharger depuis un registre.";
  }
  return null;
}
