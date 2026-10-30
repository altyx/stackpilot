import { useMemo } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import {
  queryKeys,
  useContainers,
  useImages,
  useStacks,
  useVolumes,
} from '../../../../src/api/hooks';
import { DiskUsageCard } from '../../../../src/components/DiskUsageCard';
import { ErrorView } from '../../../../src/components/ErrorView';
import { HealthCard } from '../../../../src/components/HealthCard';
import { HealthCounts } from '../../../../src/components/HealthCounts';
import { ImageUpdatesCard } from '../../../../src/components/ImageUpdatesCard';
import { Loader } from '../../../../src/components/Loader';
import { ResourcesCard } from '../../../../src/components/ResourcesCard';
import { Section } from '../../../../src/components/Section';
import { StatTile } from '../../../../src/components/StatTile';
import {
  containerProblems,
  countContainers,
  countStackStates,
  type StackCounts,
} from '../../../../src/lib/overview';
import { useStrings, type Strings } from '../../../../src/i18n';
import { groupByStack, mergeStacks } from '../../../../src/lib/stacks';
import { imagesWithUsage, volumesWithUsage } from '../../../../src/lib/usage';
import { useEndpointParam } from '../../../../src/navigation/CurrentEndpoint';
import { createStyles, useTheme } from '../../../../src/theme';

export default function OverviewScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const t = useStrings();
  const id = useEndpointParam();
  const queryClient = useQueryClient();
  const containers = useContainers(id);
  const stacks = useStacks(id);
  const images = useImages(id);
  const volumes = useVolumes(id);

  const list = useMemo(() => containers.data ?? [], [containers.data]);
  const running = useMemo(() => list.filter((c) => c.State === 'running'), [list]);
  const problems = useMemo(() => containerProblems(list), [list]);
  const counts = useMemo(() => countContainers(list), [list]);
  const stackCounts = useMemo(
    () => countStackStates(mergeStacks(groupByStack(list), stacks.data ?? [])),
    [list, stacks.data],
  );
  // Usage comes from the container list, like on the images and volumes screens.
  const unusedImages = useMemo(
    () => imagesWithUsage(images.data ?? [], list).filter((u) => u.usedBy.length === 0).length,
    [images.data, list],
  );
  const unusedVolumes = useMemo(
    () => volumesWithUsage(volumes.data ?? [], list).filter((u) => u.usedBy.length === 0).length,
    [volumes.data, list],
  );

  if (containers.isPending) return <Loader label={t.overview.loading} />;
  if (containers.error) return <ErrorView error={containers.error} onRetry={containers.refetch} />;

  function refresh() {
    void containers.refetch();
    void stacks.refetch();
    void images.refetch();
    void volumes.refetch();
    // Costly readings stay cached while browsing; pulling asks for fresh ones.
    void queryClient.invalidateQueries({ queryKey: ['containerStats', id] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.diskUsage(id) });
  }

  const base = `/endpoints/${id}` as const;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={containers.isRefetching}
          onRefresh={refresh}
          tintColor={theme.colors.accent}
        />
      }>
      <HealthCard endpointId={id} problems={problems} />

      <Section title={t.overview.atAGlance}>
        <View style={styles.tiles}>
          <StatTile
            label={t.nav.containers}
            value={`${counts.running}/${counts.total}`}
            caption={t.overview.runningCaption}
            href={base}
          />
          <StatTile
            label={t.nav.stacks}
            value={stacks.isPending ? '—' : `${stackCounts.complete}/${stackCounts.total}`}
            caption={stacks.isPending ? t.overview.loadingCaption : describeStacks(stackCounts, t)}
            alert={stackCounts.partial > 0}
            href={`${base}/stacks`}
          />
          <StatTile
            label={t.nav.images}
            value={images.data ? String(images.data.length) : '—'}
            caption={
              images.data
                ? unusedImages === 0
                  ? t.overview.allImagesInUse
                  : t.overview.unusedImages(unusedImages)
                : t.overview.loadingCaption
            }
            href={`${base}/images`}
          />
          <StatTile
            label={t.nav.volumes}
            value={volumes.data ? String(volumes.data.length) : '—'}
            caption={
              volumes.data
                ? unusedVolumes === 0
                  ? t.overview.allVolumesInUse
                  : t.overview.unusedVolumes(unusedVolumes)
                : t.overview.loadingCaption
            }
            href={`${base}/volumes`}
          />
        </View>
        <HealthCounts counts={counts} />
      </Section>

      <Section title={t.overview.resources}>
        <ResourcesCard endpointId={id} running={running} />
      </Section>

      <Section title={t.overview.diskSpace}>
        <DiskUsageCard endpointId={id} />
      </Section>

      <Section title={t.overview.imageUpdates}>
        <ImageUpdatesCard endpointId={id} containers={running} />
      </Section>
    </ScrollView>
  );
}

/** Under the complete/total ratio: only what's off, a partial stack first. */
function describeStacks(counts: StackCounts, t: Strings): string {
  if (counts.total === 0) return t.overview.noStacks;
  if (counts.partial > 0) return t.overview.partialStacks(counts.partial);
  if (counts.stopped > 0) return t.overview.stoppedStacks(counts.stopped);
  return t.overview.allRunning;
}

const useStyles = createStyles((theme) => ({
  content: { padding: theme.spacing(4), gap: theme.spacing(6), paddingBottom: theme.spacing(10) },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(3) },
}));
