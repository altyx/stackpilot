import type {
  ContainerSummary,
  ImageDeleteItem,
  ImagePruneScope,
  DiskUsageResponse,
  ImageSummary,
  VolumePruneScope,
  VolumeSummary,
} from '../api/types';
import { containerName } from './format';

export interface Usage<T> {
  item: T;
  /** Names of containers referencing the resource, stopped ones included. */
  usedBy: string[];
}

/**
 * Docker doesn't provide a reliable usage count on `/images/json` or
 * `/volumes`: it's derived from the container list, which includes stopped
 * containers. Same approach as Portainer's web UI.
 */
export function imagesWithUsage(
  images: ImageSummary[],
  containers: ContainerSummary[],
): Usage<ImageSummary>[] {
  const byImageId = new Map<string, string[]>();
  const byTag = new Map<string, string[]>();

  for (const container of containers) {
    const name = containerName(container);
    push(byImageId, container.ImageID, name);
    // A container created from a tag keeps that tag in `Image`; the id
    // remains the safe reference, the tag only serves as a fallback.
    push(byTag, container.Image, name);
  }

  return images
    .map((image) => {
      const fromId = byImageId.get(image.Id) ?? [];
      const fromTags = (image.RepoTags ?? []).flatMap((tag) => byTag.get(tag) ?? []);
      return { item: image, usedBy: [...new Set([...fromId, ...fromTags])].sort() };
    })
    .sort((a, b) => imageLabel(a.item).localeCompare(imageLabel(b.item)));
}

export function volumesWithUsage(
  volumes: VolumeSummary[],
  containers: ContainerSummary[],
): Usage<VolumeSummary>[] {
  const byVolumeName = new Map<string, string[]>();

  for (const container of containers) {
    for (const mount of container.Mounts ?? []) {
      if (mount.Type === 'volume' && mount.Name) {
        push(byVolumeName, mount.Name, containerName(container));
      }
    }
  }

  return volumes
    .map((volume) => ({
      item: volume,
      usedBy: [...new Set(byVolumeName.get(volume.Name) ?? [])].sort(),
    }))
    .sort((a, b) => a.item.Name.localeCompare(b.item.Name));
}

/** Untagged image: a leftover from a `docker build` or a replaced `pull`. */
export function isDangling(image: ImageSummary): boolean {
  const tags = image.RepoTags ?? [];
  return tags.length === 0 || tags.every((tag) => tag === '<none>:<none>');
}

export function imageLabel(image: ImageSummary): string {
  const tags = (image.RepoTags ?? []).filter((tag) => tag !== '<none>:<none>');
  return tags[0] ?? shortImageId(image.Id);
}

export function shortImageId(id: string): string {
  return id.replace(/^sha256:/, '').slice(0, 12);
}

/** Bytes reclaimable if everything unreferenced anywhere were deleted. */
export function reclaimableBytes(usages: Usage<ImageSummary>[]): number {
  return usages
    .filter((usage) => usage.usedBy.length === 0)
    .reduce((total, usage) => total + usage.item.Size, 0);
}

/**
 * Images a cleanup of this scope should delete, to preview it before
 * confirming. A dangling image a container still runs on is kept by Docker,
 * hence the usage check in both scopes.
 */
export function pruneCandidates(
  usages: Usage<ImageSummary>[],
  scope: ImagePruneScope,
): ImageSummary[] {
  return usages
    .filter((usage) => usage.usedBy.length === 0)
    .filter((usage) => scope === 'unused' || isDangling(usage.item))
    .map((usage) => usage.item);
}

/**
 * How many listed images a deletion actually removed. Docker reports every
 * untagged reference and every deleted layer: only ids matching a listed
 * image count as images.
 */
export function countDeletedImages(images: ImageSummary[], deleted: ImageDeleteItem[]): number {
  const ids = new Set(deleted.map((item) => item.Deleted).filter(Boolean));
  return images.filter((image) => ids.has(image.Id)).length;
}

/** Label Docker (Engine 23+) puts on volumes created without a name. */
const ANONYMOUS_LABEL = 'com.docker.volume.anonymous';

export function isAnonymousVolume(volume: VolumeSummary): boolean {
  return volume.Labels?.[ANONYMOUS_LABEL] !== undefined;
}

/**
 * Whether the engine honours the anonymous-only default of `volume prune`.
 * Before Engine 23 the same call deletes every unused volume, named ones
 * included: the narrow scope must not be offered there. Unknown counts as old.
 */
export function supportsAnonymousPrune(serverVersion: string | undefined): boolean {
  const major = Number(/^(\d+)\./.exec(serverVersion ?? '')?.[1]);
  return Number.isInteger(major) && major >= 23;
}

/** Volumes a cleanup of this scope should delete, to preview it before confirming. */
export function volumePruneCandidates(
  usages: Usage<VolumeSummary>[],
  scope: VolumePruneScope,
): VolumeSummary[] {
  return usages
    .filter((usage) => usage.usedBy.length === 0)
    .filter((usage) => scope === 'all' || isAnonymousVolume(usage.item))
    .map((usage) => usage.item);
}

/**
 * Size of each volume, from `docker system df`: the volume list doesn't
 * carry it. Sizes Docker skipped computing (-1) are left out.
 */
export function volumeSizes(df: DiskUsageResponse | undefined): Map<string, number> {
  const sizes = new Map<string, number>();
  for (const volume of df?.Volumes ?? []) {
    const size = volume.UsageData?.Size;
    if (size !== undefined && size >= 0) sizes.set(volume.Name, size);
  }
  return sizes;
}

/**
 * What a user types to confirm deleting a volume: its name when it has a
 * readable one, a fixed word for anonymous volumes and their 64-character ids.
 */
export function volumeConfirmPhrase(volume: VolumeSummary): string {
  return isAnonymousVolume(volume) || volume.Name.length > 40 ? 'delete' : volume.Name;
}

function push(map: Map<string, string[]>, key: string, value: string): void {
  if (!key) return;
  const existing = map.get(key);
  if (existing) existing.push(value);
  else map.set(key, [value]);
}
