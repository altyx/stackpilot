import type { ContainerSummary } from '../api/types';
import { containerName } from './format';

/** Label set by Docker Compose; it's the stack name on Portainer's side. */
const COMPOSE_PROJECT = 'com.docker.compose.project';
/** Equivalent for Swarm stacks. */
const SWARM_NAMESPACE = 'com.docker.stack.namespace';

const UNGROUPED_KEY = ' sans-stack';

export interface StackSection {
  key: string;
  title: string;
  /** Visible members after filtering: what the list displays. */
  data: ContainerSummary[];
  /** All members, filter ignored: the target of grouped actions. */
  members: ContainerSummary[];
  /** Running members, over the whole stack. */
  running: number;
  /** True for the group of containers outside any stack, which isn't actionable. */
  ungrouped: boolean;
}

/**
 * The stack name is already carried by the containers: no call to
 * `/api/stacks` is needed, and the grouping stays correct even with a token
 * whose permissions don't cover Portainer stacks.
 */
export function stackOf(container: ContainerSummary): string | null {
  const labels = container.Labels ?? {};
  return labels[COMPOSE_PROJECT] || labels[SWARM_NAMESPACE] || null;
}

/**
 * Groups every container, then exposes only the ones `isVisible` keeps.
 * Stack actions act on `members`, i.e. the whole stack, while the list only
 * displays `data`: a filter must never silently narrow the scope of a stack
 * stop.
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
      // Containers outside any stack close out the list: they're the odd ones out.
      if (a.ungrouped) return 1;
      if (b.ungrouped) return -1;
      return a.title.localeCompare(b.title);
    });
}

/** Number of real stacks, excluding the group of standalone containers. */
export function countStacks(sections: StackSection[]): number {
  return sections.filter((section) => !section.ungrouped).length;
}
