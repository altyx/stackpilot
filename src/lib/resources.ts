import type { ContainerStatsResponse, ContainerSummary, DockerInfo } from '../api/types';
import { containerName } from './format';

/**
 * CPU use as `docker stats` shows it: 100 % is one full core, so a busy
 * container can exceed 100 on a multi-core host. `null` when the reading
 * lacks a previous sample to compare with.
 */
export function cpuPercent(stats: ContainerStatsResponse): number | null {
  const cpu = stats.cpu_stats;
  const pre = stats.precpu_stats;
  const total = cpu?.cpu_usage?.total_usage;
  const preTotal = pre?.cpu_usage?.total_usage;
  const system = cpu?.system_cpu_usage;
  const preSystem = pre?.system_cpu_usage;
  if (total === undefined || preTotal === undefined || system === undefined) return null;
  if (preSystem === undefined) return null;

  const cpuDelta = total - preTotal;
  const systemDelta = system - preSystem;
  if (systemDelta <= 0 || cpuDelta < 0) return null;
  const cores = cpu?.online_cpus || cpu?.cpu_usage?.percpu_usage?.length || 1;
  return (cpuDelta / systemDelta) * cores * 100;
}

/**
 * Memory the container really holds, the way `docker stats` counts it: page
 * cache the kernel can drop at will is left out, or every container reading
 * files would look full.
 */
export function memoryUsed(stats: ContainerStatsResponse): number | null {
  const memory = stats.memory_stats;
  if (memory?.usage === undefined) return null;
  const cache = memory.stats?.inactive_file ?? memory.stats?.total_inactive_file ?? 0;
  return Math.max(memory.usage - cache, 0);
}

export interface ContainerUsage {
  id: string;
  name: string;
  cpu: number | null;
  memory: number | null;
}

export interface ResourceSummary {
  /** Share of the host's total CPU capacity, 0 to 100. */
  cpuPercent: number;
  memoryUsed: number;
  memoryTotal: number;
  /** Containers by CPU use, heaviest first. */
  containers: ContainerUsage[];
}

export function summarizeResources(
  info: DockerInfo,
  readings: { container: ContainerSummary; stats: ContainerStatsResponse }[],
): ResourceSummary {
  const containers = readings.map(({ container, stats }) => ({
    id: container.Id,
    name: containerName(container),
    cpu: cpuPercent(stats),
    memory: memoryUsed(stats),
  }));
  const cpuSum = containers.reduce((total, usage) => total + (usage.cpu ?? 0), 0);
  const memorySum = containers.reduce((total, usage) => total + (usage.memory ?? 0), 0);
  const cores = Math.max(info.NCPU, 1);
  return {
    cpuPercent: Math.min(cpuSum / cores, 100),
    memoryUsed: memorySum,
    memoryTotal: info.MemTotal,
    containers: containers.sort(
      (a, b) => (b.cpu ?? -1) - (a.cpu ?? -1) || (b.memory ?? -1) - (a.memory ?? -1),
    ),
  };
}

/** "12%" with one decimal below 10, where the decimal still tells something. */
export function formatPercent(value: number): string {
  const rounded = value < 10 ? value.toFixed(1) : String(Math.round(value));
  return `${rounded}%`;
}
