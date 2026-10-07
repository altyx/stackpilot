import { summarizeDiskUsage } from './disk';

describe('summarizeDiskUsage', () => {
  it('totals each category and what a cleanup would free', () => {
    const summary = summarizeDiskUsage({
      LayersSize: 1_000,
      Images: [
        { Size: 600, SharedSize: 200, Containers: 0 },
        { Size: 500, SharedSize: 200, Containers: 2 },
      ],
      Containers: [
        { SizeRw: 30, State: 'running' },
        { SizeRw: 20, State: 'exited' },
      ],
      Volumes: [
        { Name: 'v', UsageData: { Size: 300, RefCount: 1 } },
        { Name: 'v', UsageData: { Size: 100, RefCount: 0 } },
      ],
      BuildCache: [
        { Size: 50, InUse: false },
        { Size: 10, InUse: true },
      ],
    });
    expect(summary.categories.map((c) => [c.key, c.size, c.reclaimable])).toEqual([
      ['images', 1_000, 400],
      ['containers', 50, 20],
      ['volumes', 400, 100],
      ['buildCache', 60, 50],
    ]);
    expect(summary.total).toBe(1_510);
    expect(summary.reclaimable).toBe(570);
  });

  it('treats sizes Docker skipped (-1) and missing lists as empty', () => {
    const summary = summarizeDiskUsage({
      Images: null,
      Containers: [{ State: 'exited' }],
      Volumes: [
        { Name: 'v', UsageData: { Size: -1, RefCount: -1 } },
        { Name: 'v', UsageData: null },
      ],
    });
    expect(summary.total).toBe(0);
    expect(summary.reclaimable).toBe(0);
  });
});
