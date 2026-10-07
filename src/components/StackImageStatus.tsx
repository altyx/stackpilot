import type { ImageStatus } from '../api/types';
import { useStackImageStatus } from '../api/hooks';
import { ImageStatusIcon } from './ImageStatusIcon';

/** A stack holds several images: Portainer says outdated as soon as one is. */
const STACK_LABELS: Record<ImageStatus, string> = {
  updated: 'Images à jour',
  outdated: "Mise à jour d'image disponible",
  processing: 'Vérification des images…',
  unknown: 'Statut des images indéterminé',
};

/**
 * Image status of a stack, for its card or its detail screen. Same rules as
 * `ContainerImageStatus`: nothing where Portainer doesn't check, and a failed
 * check only spelled out on the detail screen.
 *
 * On a card, only an available update shows: a green tick there would read as
 * "the stack is fine", which says nothing about its containers. The detail
 * screen still spells out "up to date", where the words remove the doubt.
 */
export function StackImageStatus({
  endpointId,
  stackId,
  withLabel = false,
}: {
  endpointId: number;
  stackId: number;
  withLabel?: boolean;
}) {
  const { data, isError, isPending, fetchStatus } = useStackImageStatus(endpointId, stackId);

  if (isPending && fetchStatus === 'idle') return null;
  if (isPending) {
    return withLabel ? (
      <ImageStatusIcon status="processing" withLabel labels={STACK_LABELS} />
    ) : null;
  }

  const status = isError ? 'unknown' : data;
  if (!withLabel && status !== 'outdated') return null;
  return <ImageStatusIcon status={status} withLabel={withLabel} labels={STACK_LABELS} />;
}
