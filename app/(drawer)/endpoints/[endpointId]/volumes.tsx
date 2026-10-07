import { useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useEndpointParam } from '../../../../src/navigation/CurrentEndpoint';
import {
  useContainers,
  useDiskUsage,
  useDockerInfo,
  usePruneVolumes,
  useRemoveVolume,
  useVolumes,
} from '../../../../src/api/hooks';
import type { VolumePruneScope, VolumeSummary } from '../../../../src/api/types';
import { Button } from '../../../../src/components/Button';
import { ConfirmSheet } from '../../../../src/components/ConfirmSheet';
import { EmptyState } from '../../../../src/components/EmptyState';
import { ErrorView } from '../../../../src/components/ErrorView';
import { Loader } from '../../../../src/components/Loader';
import { Segmented } from '../../../../src/components/Segmented';
import { useLatched } from '../../../../src/components/useLatched';
import { VolumeCard } from '../../../../src/components/VolumeCard';
import { VolumePruneSheet } from '../../../../src/components/VolumePruneSheet';
import { formatBytes } from '../../../../src/lib/format';
import {
  supportsAnonymousPrune,
  volumeConfirmPhrase,
  volumePruneCandidates,
  volumeSizes,
  volumesWithUsage,
} from '../../../../src/lib/usage';
import { theme } from '../../../../src/theme';

type Filter = 'all' | 'used' | 'unused';

export default function VolumesScreen() {
  const id = useEndpointParam();

  const volumes = useVolumes(id);
  const containers = useContainers(id);
  // Sizes and engine version are extras: the list works without them.
  const disk = useDiskUsage(id);
  const info = useDockerInfo(id);
  const remove = useRemoveVolume(id);
  const prune = usePruneVolumes(id);
  const [filter, setFilter] = useState<Filter>('all');
  const [pruning, setPruning] = useState(false);
  const [deleting, setDeleting] = useState<VolumeSummary | null>(null);
  const shownDeleting = useLatched(deleting);

  const usages = useMemo(
    () => volumesWithUsage(volumes.data ?? [], containers.data ?? []),
    [volumes.data, containers.data],
  );
  const sizes = useMemo(() => volumeSizes(disk.data), [disk.data]);

  const visible = useMemo(
    () =>
      usages.filter((usage) =>
        filter === 'all'
          ? true
          : filter === 'used'
            ? usage.usedBy.length > 0
            : usage.usedBy.length === 0,
      ),
    [usages, filter],
  );

  if (volumes.isPending || containers.isPending) return <Loader label="Chargement des volumes…" />;
  const error = volumes.error ?? containers.error;
  if (error) {
    return (
      <ErrorView
        error={error}
        onRetry={() => {
          void volumes.refetch();
          void containers.refetch();
        }}
      />
    );
  }

  const unused = usages.filter((usage) => usage.usedBy.length === 0);
  const reclaimable = unused.reduce((sum, usage) => sum + (sizes.get(usage.item.Name) ?? 0), 0);
  const busy = remove.isPending || prune.isPending;

  function removeVolume(volume: VolumeSummary) {
    remove.mutate(volume.Name, {
      onError: (e) =>
        Alert.alert(
          'Suppression échouée',
          e instanceof Error ? e.message : "Le volume n'a pas pu être supprimé.",
        ),
    });
  }

  function runPrune(scope: VolumePruneScope) {
    const expected = volumePruneCandidates(usages, scope).length;
    prune.mutate(scope, {
      onSuccess: ({ deleted, spaceReclaimed }) =>
        Alert.alert('Nettoyage terminé', describePrune(deleted.length, expected, spaceReclaimed)),
      onError: (e) =>
        Alert.alert(
          'Nettoyage échoué',
          e instanceof Error ? e.message : "Les volumes n'ont pas pu être supprimés.",
        ),
    });
  }

  return (
    <>
      <FlatList
        data={visible}
        keyExtractor={(usage) => usage.item.Name}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={volumes.isRefetching || containers.isRefetching}
            onRefresh={() => {
              void volumes.refetch();
              void containers.refetch();
              void disk.refetch();
            }}
            tintColor={theme.colors.accent}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.summary}>
              {usages.length} volume{usages.length > 1 ? 's' : ''} · {unused.length} inutilisé
              {unused.length > 1 ? 's' : ''}
              {reclaimable > 0 ? ` · ${formatBytes(reclaimable)} récupérables` : ''}
            </Text>
            {unused.length > 0 ? (
              <Button
                label="Nettoyer les volumes"
                variant="secondary"
                onPress={() => setPruning(true)}
                loading={prune.isPending}
                disabled={busy}
              />
            ) : null}
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'Tous' },
                { value: 'used', label: 'Utilisés' },
                { value: 'unused', label: 'Inutilisés' },
              ]}
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState title="Aucun volume" subtitle="Aucun résultat pour ce filtre." />
        }
        renderItem={({ item }) => (
          <VolumeCard
            usage={item}
            size={sizes.get(item.item.Name)}
            onDelete={item.usedBy.length === 0 && !busy ? () => setDeleting(item.item) : undefined}
          />
        )}
      />
      <VolumePruneSheet
        visible={pruning}
        usages={usages}
        sizes={sizes}
        anonymousScopeAvailable={supportsAnonymousPrune(info.data?.ServerVersion)}
        onConfirm={runPrune}
        onClose={() => setPruning(false)}
      />
      <ConfirmSheet
        visible={deleting !== null}
        title="Supprimer le volume ?"
        message={shownDeleting ? describeRemoval(shownDeleting, sizes) : undefined}
        confirmLabel="Supprimer définitivement"
        confirmPhrase={shownDeleting ? volumeConfirmPhrase(shownDeleting) : undefined}
        destructive
        onConfirm={() => {
          const volume = deleting;
          setDeleting(null);
          if (volume) removeVolume(volume);
        }}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

function describeRemoval(volume: VolumeSummary, sizes: Map<string, number>): string {
  const size = sizes.get(volume.Name);
  return (
    `${volume.Name}${size !== undefined ? ` (${formatBytes(size)})` : ''} et toutes ses ` +
    'données seront supprimés définitivement. Aucune récupération possible.'
  );
}

/**
 * Docker decides on its side what is unused: a gap with the preview means the
 * list was stale, worth saying rather than hiding.
 */
function describePrune(deleted: number, expected: number, reclaimed: number): string {
  if (deleted === 0) return "Aucun volume n'a été supprimé.";
  const volumes = `${deleted} volume${deleted > 1 ? 's' : ''} supprimé${deleted > 1 ? 's' : ''}`;
  const freed = reclaimed > 0 ? ` · ${formatBytes(reclaimed)} libérés` : '';
  const gap = deleted !== expected ? ` (${expected} prévu${expected > 1 ? 's' : ''})` : '';
  return `${volumes}${freed}${gap}.`;
}

const styles = StyleSheet.create({
  list: { padding: theme.spacing(4), gap: theme.spacing(3) },
  header: { gap: theme.spacing(2) },
  summary: { color: theme.colors.textMuted, fontSize: 12 },
});
