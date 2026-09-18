import { useImageStatus } from '../api/hooks';
import { ImageStatusIcon } from './ImageStatusIcon';

/**
 * Image status of one container, for a list row or the detail screen.
 *
 * Renders nothing when Portainer doesn't provide the indicator (Community
 * Edition, or indicator disabled on the environment): the query stays idle
 * and no icon claims a status nobody checked. A failed check is treated the
 * same way in the list, and named in the detail screen.
 */
export function ContainerImageStatus({
  endpointId,
  containerId,
  withLabel = false,
}: {
  endpointId: number;
  containerId: string;
  withLabel?: boolean;
}) {
  const { data, isError, isPending, fetchStatus } = useImageStatus(endpointId, containerId);

  // `isPending` alone also covers a disabled query: `fetchStatus` tells a
  // check in progress apart from one that will never run.
  if (isPending && fetchStatus === 'idle') return null;
  if (isPending) return withLabel ? <ImageStatusIcon status="processing" withLabel /> : null;

  const status = isError ? 'unknown' : data;
  if (status === 'unknown' && !withLabel) return null;
  return <ImageStatusIcon status={status} withLabel={withLabel} />;
}
