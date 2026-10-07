import type { ContainerSummary } from '../api/types';
import { containerName } from './format';
import type { StackOverview } from './stacks';

export type ContainerHealth = 'healthy' | 'unhealthy' | 'starting' | 'none';

/**
 * Health as Docker reports it in the list's `Status` ("Up 2 hours (healthy)").
 * Read from the text rather than an inspect per container: the list is
 * already loaded and refreshed.
 */
export function containerHealth(container: ContainerSummary): ContainerHealth {
  const status = container.Status;
  if (status.includes('(unhealthy)')) return 'unhealthy';
  if (status.includes('(healthy)')) return 'healthy';
  if (status.includes('(health: starting)')) return 'starting';
  return 'none';
}

/** Exit code of a stopped container, from "Exited (1) 3 hours ago". */
export function exitCode(container: ContainerSummary): number | null {
  const match = /^Exited \((-?\d+)\)/.exec(container.Status);
  return match ? Number(match[1]) : null;
}

/**
 * Codes a requested stop leaves behind: 0, and the SIGINT/SIGTERM exits of
 * apps that don't trap the signal. 137 (SIGKILL) stays a problem: it's also
 * how the kernel ends a container out of memory.
 */
const CLEAN_EXIT_CODES: ReadonlySet<number> = new Set([0, 130, 143]);

export type ProblemKind = 'unhealthy' | 'restarting' | 'crashed' | 'dead';

export interface ContainerProblem {
  container: ContainerSummary;
  kind: ProblemKind;
}

const PROBLEM_ORDER: Record<ProblemKind, number> = {
  unhealthy: 0,
  restarting: 1,
  crashed: 2,
  dead: 3,
};

export const PROBLEM_LABELS: Record<ProblemKind, string> = {
  unhealthy: 'Healthcheck en échec',
  restarting: 'Redémarre en boucle',
  crashed: 'Arrêt anormal',
  dead: 'Mort',
};

/** Containers worth a look, most urgent first. */
export function containerProblems(containers: ContainerSummary[]): ContainerProblem[] {
  const problems: ContainerProblem[] = [];
  for (const container of containers) {
    const kind = problemOf(container);
    if (kind) problems.push({ container, kind });
  }
  return problems.sort(
    (a, b) =>
      PROBLEM_ORDER[a.kind] - PROBLEM_ORDER[b.kind] ||
      containerName(a.container).localeCompare(containerName(b.container)),
  );
}

function problemOf(container: ContainerSummary): ProblemKind | null {
  if (container.State === 'dead') return 'dead';
  if (container.State === 'restarting') return 'restarting';
  if (containerHealth(container) === 'unhealthy') return 'unhealthy';
  if (container.State === 'exited') {
    const code = exitCode(container);
    if (code !== null && !CLEAN_EXIT_CODES.has(code)) return 'crashed';
  }
  return null;
}

export interface ContainerCounts {
  total: number;
  running: number;
  stopped: number;
  healthy: number;
  unhealthy: number;
  starting: number;
  /** Containers without a healthcheck: Docker can't tell their health. */
  unchecked: number;
}

export function countContainers(containers: ContainerSummary[]): ContainerCounts {
  const counts: ContainerCounts = {
    total: containers.length,
    running: 0,
    stopped: 0,
    healthy: 0,
    unhealthy: 0,
    starting: 0,
    unchecked: 0,
  };
  for (const container of containers) {
    if (container.State === 'running') counts.running += 1;
    else counts.stopped += 1;
    const health = containerHealth(container);
    if (health === 'none') counts.unchecked += 1;
    else counts[health] += 1;
  }
  return counts;
}

export interface StackCounts {
  total: number;
  /** Every container running. */
  complete: number;
  partial: number;
  /** No container running, including stacks Portainer knows but that have none. */
  stopped: number;
}

export function countStackStates(overviews: StackOverview[]): StackCounts {
  const counts: StackCounts = { total: overviews.length, complete: 0, partial: 0, stopped: 0 };
  for (const { running, total } of overviews) {
    if (total > 0 && running === total) counts.complete += 1;
    else if (running > 0) counts.partial += 1;
    else counts.stopped += 1;
  }
  return counts;
}
