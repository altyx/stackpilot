import type { DiskUsageResponse } from '../api/types';

export type DiskCategoryKey = 'images' | 'containers' | 'volumes' | 'buildCache';

export interface DiskCategory {
  key: DiskCategoryKey;
  label: string;
  size: number;
  /** What a cleanup of unused items would free, as `docker system df` estimates it. */
  reclaimable: number;
}

export interface DiskSummary {
  categories: DiskCategory[];
  total: number;
  reclaimable: number;
}

/**
 * Docker's disk use by category, read like `docker system df`.
 *
 * Images share layers: their total is `LayersSize`, not the sum of their
 * sizes, and an unused image only frees the part it doesn't share. Docker
 * reports -1 for sizes it skipped computing; those count as zero.
 */
export function summarizeDiskUsage(df: DiskUsageResponse): DiskSummary {
  const images = df.Images ?? [];
  const containers = df.Containers ?? [];
  const volumes = df.Volumes ?? [];
  const cache = df.BuildCache ?? [];

  const categories: DiskCategory[] = [
    {
      key: 'images',
      label: 'Images',
      size: known(df.LayersSize ?? sum(images.map((image) => image.Size))),
      reclaimable: sum(
        images
          .filter((image) => image.Containers === 0)
          .map((image) => known(image.Size) - known(image.SharedSize)),
      ),
    },
    {
      key: 'containers',
      label: 'Containers',
      size: sum(containers.map((container) => known(container.SizeRw))),
      reclaimable: sum(
        containers
          .filter((container) => container.State !== 'running')
          .map((container) => known(container.SizeRw)),
      ),
    },
    {
      key: 'volumes',
      label: 'Volumes',
      size: sum(volumes.map((volume) => known(volume.UsageData?.Size))),
      reclaimable: sum(
        volumes
          .filter((volume) => volume.UsageData?.RefCount === 0)
          .map((volume) => known(volume.UsageData?.Size)),
      ),
    },
    {
      key: 'buildCache',
      label: 'Build cache',
      size: sum(cache.map((entry) => known(entry.Size))),
      reclaimable: sum(cache.filter((entry) => !entry.InUse).map((entry) => known(entry.Size))),
    },
  ];

  return {
    categories,
    total: sum(categories.map((category) => category.size)),
    reclaimable: sum(categories.map((category) => category.reclaimable)),
  };
}

function known(size: number | undefined): number {
  return size !== undefined && size > 0 ? size : 0;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + Math.max(value, 0), 0);
}
