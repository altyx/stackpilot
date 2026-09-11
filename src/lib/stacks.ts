import type { ContainerSummary } from '../api/types';
import { containerName } from './format';

/** Label posé par Docker Compose ; c'est le nom de la stack côté Portainer. */
const COMPOSE_PROJECT = 'com.docker.compose.project';
/** Équivalent pour les stacks Swarm. */
const SWARM_NAMESPACE = 'com.docker.stack.namespace';

const UNGROUPED_KEY = ' sans-stack';

export interface StackSection {
  key: string;
  title: string;
  /** Membres visibles après filtrage : ce que la liste affiche. */
  data: ContainerSummary[];
  /** Tous les membres, filtre ignoré : la cible des actions groupées. */
  members: ContainerSummary[];
  /** Membres en cours d'exécution, sur la stack complète. */
  running: number;
  /** Vrai pour le groupe des conteneurs hors stack, qui n'est pas actionnable. */
  ungrouped: boolean;
}

/**
 * Le nom de la stack est déjà porté par les conteneurs : aucun appel à
 * `/api/stacks` n'est nécessaire, et le regroupement reste correct même avec un
 * token dont les droits ne couvrent pas les stacks Portainer.
 */
export function stackOf(container: ContainerSummary): string | null {
  const labels = container.Labels ?? {};
  return labels[COMPOSE_PROJECT] || labels[SWARM_NAMESPACE] || null;
}

/**
 * Regroupe tous les conteneurs, puis n'expose que ceux retenus par `isVisible`.
 * Les actions de stack portent sur `members`, donc sur la stack complète, alors
 * que la liste n'affiche que `data` : un filtre ne doit pas silencieusement
 * réduire la portée d'un arrêt de stack.
 */
export function groupByStack(
  containers: ContainerSummary[],
  isVisible: (container: ContainerSummary) => boolean = () => true,
): StackSection[] {
  const groups = new Map<string, ContainerSummary[]>();

  for (const container of containers) {
    const key = stackOf(container) ?? UNGROUPED_KEY;
    const existing = groups.get(key);
    if (existing) existing.push(container);
    else groups.set(key, [container]);
  }

  const byName = (a: ContainerSummary, b: ContainerSummary) =>
    containerName(a).localeCompare(containerName(b));

  return [...groups.entries()]
    .map(([key, members]) => {
      const sorted = [...members].sort(byName);
      return {
        key,
        title: key === UNGROUPED_KEY ? 'Sans stack' : key,
        data: sorted.filter(isVisible),
        members: sorted,
        running: sorted.filter((container) => container.State === 'running').length,
        ungrouped: key === UNGROUPED_KEY,
      };
    })
    .filter((section) => section.data.length > 0)
    .sort((a, b) => {
      // Les conteneurs hors stack ferment la liste : ce sont les cas isolés.
      if (a.ungrouped) return 1;
      if (b.ungrouped) return -1;
      return a.title.localeCompare(b.title);
    });
}

/** Nombre de stacks réelles, en excluant le groupe des conteneurs isolés. */
export function countStacks(sections: StackSection[]): number {
  return sections.filter((section) => !section.ungrouped).length;
}
