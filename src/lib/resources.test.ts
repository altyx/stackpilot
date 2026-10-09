import type { ContainerStatsResponse } from '../api/types';
import { makeContainer } from '../testing/fixtures';
import { cpuPercent, formatPercent, memoryUsed, summarizeResources } from './resources';

function stats(cpu: number, memory: number, cache = 0): ContainerStatsResponse {
  // Two samples, 1 s apart on a 4-core host: `cpu` is the share of one core used.
  return {
    cpu_stats: {
      cpu_usage: { total_usage: 1_000 + cpu * 10 },
      system_cpu_usage: 10_000 + 4_000,
      online_cpus: 4,
    },
    precpu_stats: { cpu_usage: { total_usage: 1_000 }, system_cpu_usage: 10_000 },
    memory_stats: { usage: memory, limit: 8_000, stats: { inactive_file: cache } },
  };
}

describe('cpuPercent', () => {
  it('computes the docker stats percentage, where 100 is one core', () => {
    expect(cpuPercent(stats(50, 0))).toBeCloseTo(50);
    expect(cpuPercent(stats(250, 0))).toBeCloseTo(250);
  });

  it('gives up without a previous sample', () => {
    expect(cpuPercent({ cpu_stats: stats(10, 0).cpu_stats })).toBeNull();
    expect(cpuPercent({})).toBeNull();
  });

  it('falls back to the per-core list for older hosts', () => {
    const reading = stats(50, 0);
    delete reading.cpu_stats!.online_cpus;
    reading.cpu_stats!.cpu_usage!.percpu_usage = [1, 2, 3, 4];
    expect(cpuPercent(reading)).toBeCloseTo(50);
  });
});

describe('memoryUsed', () => {
  it('leaves out page cache, on cgroup v2 and v1', () => {
    expect(memoryUsed(stats(0, 1_000, 300))).toBe(700);
    expect(
      memoryUsed({ memory_stats: { usage: 1_000, stats: { total_inactive_file: 400 } } }),
    ).toBe(600);
    expect(memoryUsed({})).toBeNull();
  });
});

describe('summarizeResources', () => {
  it('scales CPU to the host and ranks containers by use', () => {
    const summary = summarizeResources({ NCPU: 4, MemTotal: 8_000 }, [
      { container: makeContainer({ Id: 'a', Names: ['/api'] }), stats: stats(100, 1_000) },
      { container: makeContainer({ Id: 'b', Names: ['/db'] }), stats: stats(200, 3_000) },
      { container: makeContainer({ Id: 'c', Names: ['/new'] }), stats: {} },
    ]);
    expect(summary.cpuPercent).toBeCloseTo(75);
    expect(summary.memoryUsed).toBe(4_000);
    expect(summary.memoryTotal).toBe(8_000);
    expect(summary.containers.map((c) => c.name)).toEqual(['db', 'api', 'new']);
  });

  it('caps the host CPU at 100%', () => {
    const summary = summarizeResources({ NCPU: 1, MemTotal: 1 }, [
      { container: makeContainer(), stats: stats(300, 0) },
    ]);
    expect(summary.cpuPercent).toBe(100);
  });
});

describe('formatPercent', () => {
  it('keeps a decimal only for small values', () => {
    expect(formatPercent(3.24)).toBe('3.2%');
    expect(formatPercent(42.6)).toBe('43%');
  });
});
