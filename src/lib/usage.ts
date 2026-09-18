import type { ContainerSummary, ImageSummary, VolumeSummary } from '../api/types';
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

function push(map: Map<string, string[]>, key: string, value: string): void {
  if (!key) return;
  const existing = map.get(key);
  if (existing) existing.push(value);
  else map.set(key, [value]);
}
