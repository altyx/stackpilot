import { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
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
import { groupByStack, mergeStacks } from '../../../../src/lib/stacks';
import { imagesWithUsage, volumesWithUsage } from '../../../../src/lib/usage';
import { useEndpointParam } from '../../../../src/navigation/CurrentEndpoint';
import { theme } from '../../../../src/theme';

export default function OverviewScreen() {
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

  if (containers.isPending) return <Loader label="Chargement de l'environnement…" />;
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

      <Section title="En un coup d'œil">
        <View style={styles.tiles}>
          <StatTile
            label="Conteneurs"
            value={`${counts.running}/${counts.total}`}
            caption="en cours"
            href={base}
          />
          <StatTile
            label="Stacks"
            value={stacks.isPending ? '—' : `${stackCounts.complete}/${stackCounts.total}`}
            caption={stacks.isPending ? 'chargement…' : describeStacks(stackCounts)}
            alert={stackCounts.partial > 0}
            href={`${base}/stacks`}
          />
          <StatTile
            label="Images"
            value={images.data ? String(images.data.length) : '—'}
            caption={images.data ? describeUnused(unusedImages, 'feminine') : 'chargement…'}
            href={`${base}/images`}
          />
          <StatTile
            label="Volumes"
            value={volumes.data ? String(volumes.data.length) : '—'}
            caption={volumes.data ? describeUnused(unusedVolumes, 'masculine') : 'chargement…'}
            href={`${base}/volumes`}
          />
        </View>
        <HealthCounts counts={counts} />
      </Section>

      <Section title="Ressources">
        <ResourcesCard endpointId={id} running={running} />
      </Section>

      <Section title="Espace disque">
        <DiskUsageCard endpointId={id} />
      </Section>

      <Section title="Mises à jour des images">
        <ImageUpdatesCard endpointId={id} containers={running} />
      </Section>
    </ScrollView>
  );
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count > 1 ? 's' : ''}`;
}

/** Under the complete/total ratio: only what's off, a partial stack first. */
function describeStacks(counts: StackCounts): string {
  if (counts.total === 0) return 'aucune stack';
  if (counts.partial > 0) return plural(counts.partial, 'partielle');
  if (counts.stopped > 0) return plural(counts.stopped, 'arrêtée');
  return 'complètes';
}

/** Images are feminine in French, volumes masculine. */
function describeUnused(count: number, gender: 'feminine' | 'masculine'): string {
  if (gender === 'feminine') return count === 0 ? 'toutes utilisées' : plural(count, 'inutilisée');
  return count === 0 ? 'tous utilisés' : plural(count, 'inutilisé');
}

const styles = StyleSheet.create({
  content: { padding: theme.spacing(4), gap: theme.spacing(6), paddingBottom: theme.spacing(10) },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(3) },
});
