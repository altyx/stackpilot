import type { ContainerSummary, ImageSummary, VolumeSummary } from '../api/types';
import { containerName } from './format';

export interface Usage<T> {
  item: T;
  /** Noms des conteneurs qui référencent la ressource, arrêtés compris. */
  usedBy: string[];
}

/**
 * Docker ne renseigne pas de compteur d'utilisation fiable sur `/images/json`
 * ni sur `/volumes` : on le dérive de la liste des conteneurs, qui inclut les
 * conteneurs arrêtés. C'est la même approche que l'interface web de Portainer.
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
    // Un conteneur créé depuis un tag garde ce tag dans `Image` ; l'ID reste
    // la référence sûre, le tag ne sert que de repli.
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

/** Image sans tag : reliquat d'un `docker build` ou d'un `pull` remplacé. */
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

/** Octets récupérables si l'on supprimait tout ce qui n'est référencé nulle part. */
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
