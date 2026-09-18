import type { StackActionResult } from '../api/hooks';
import {
  StackType,
  type ContainerSummary,
  type PortainerStack,
  type StackAction,
} from '../api/types';
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

export type StackKind = 'compose' | 'swarm' | 'external';

export const STACK_KIND_LABELS: Record<StackKind, string> = {
  compose: 'Compose',
  swarm: 'Swarm',
  external: 'Externe',
};

/** A stack as the Stacks screens show it: Portainer's record and/or its containers. */
export interface StackOverview {
  /** Compose project, Swarm namespace or Portainer stack name: the same string. */
  name: string;
  kind: StackKind;
  /** Portainer's record; null for a stack deployed outside Portainer. */
  stack: PortainerStack | null;
  /** Its containers; null when none exists (stopped in Portainer, or never deployed). */
  section: StackSection | null;
  running: number;
  total: number;
}

function kindOf(stack: PortainerStack): StackKind {
  return stack.Type === StackType.DockerSwarm ? 'swarm' : 'compose';
}

/**
 * Joins what Portainer knows about stacks with what the containers carry.
 * Portainer names a Compose project after its stack, so the two sides meet
 * on the name. A stack present on one side only is still worth listing: an
 * "external" one Portainer never deployed, or a Portainer one whose
 * containers are gone.
 */
export function mergeStacks(sections: StackSection[], stacks: PortainerStack[]): StackOverview[] {
  const byName = new Map<string, StackOverview>();

  for (const stack of stacks) {
    if (stack.Type === StackType.Kubernetes) continue;
    byName.set(stack.Name, {
      name: stack.Name,
      kind: kindOf(stack),
      stack,
      section: null,
      running: 0,
      total: 0,
    });
  }

  for (const section of sections) {
    if (section.ungrouped) continue;
    const known = byName.get(section.key);
    const running = section.running;
    const total = section.members.length;
    if (known) byName.set(section.key, { ...known, section, running, total });
    else {
      byName.set(section.key, {
        name: section.key,
        kind: 'external',
        stack: null,
        section,
        running,
        total,
      });
    }
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Alert content once a stack action has run on every member. */
export function describeStackResult(
  section: StackSection,
  action: StackAction,
  result: StackActionResult,
): { title: string; message: string } {
  const verb = action === 'start' ? 'démarrés' : 'arrêtés';
  if (result.failures.length === 0) {
    return { title: section.title, message: `${result.succeeded} conteneurs ${verb}.` };
  }
  const detail = result.failures.map((f) => `• ${f.name} : ${f.message}`).join('\n');
  return {
    title: section.title,
    message: `${result.succeeded} conteneurs ${verb}, ${result.failures.length} en échec.\n\n${detail}`,
  };
}
