import { useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, Text, View } from 'react-native';
import { useStrings, type Strings } from '../../../../src/i18n';
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
import {
  supportsAnonymousPrune,
  volumeConfirmPhrase,
  volumePruneCandidates,
  volumeSizes,
  volumesWithUsage,
} from '../../../../src/lib/usage';
import { createStyles, useTheme } from '../../../../src/theme';

type Filter = 'all' | 'used' | 'unused';

export default function VolumesScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const t = useStrings();
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

  if (volumes.isPending || containers.isPending) return <Loader label={t.volumes.loading} />;
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
          t.common.deleteFailed,
          e instanceof Error ? e.message : t.volumes.deleteNotApplied,
        ),
    });
  }

  function runPrune(scope: VolumePruneScope) {
    const expected = volumePruneCandidates(usages, scope).length;
    prune.mutate(scope, {
      onSuccess: ({ deleted, spaceReclaimed }) =>
        Alert.alert(
          t.common.cleanupComplete,
          t.volumes.deleted(
            deleted.length,
            expected,
            spaceReclaimed > 0 ? t.bytes(spaceReclaimed) : null,
          ),
        ),
      onError: (e) =>
        Alert.alert(
          t.common.cleanupFailed,
          e instanceof Error ? e.message : t.volumes.pruneNotApplied,
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
              {t.volumes.summary(
                usages.length,
                unused.length,
                reclaimable > 0 ? t.bytes(reclaimable) : null,
              )}
            </Text>
            {unused.length > 0 ? (
              <Button
                label={t.volumes.cleanUp}
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
                { value: 'all', label: t.common.all },
                { value: 'used', label: t.common.used },
                { value: 'unused', label: t.common.unused },
              ]}
            />
          </View>
        }
        ListEmptyComponent={<EmptyState title={t.volumes.empty} subtitle={t.common.noMatch} />}
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
        title={t.volumes.deleteTitle}
        message={shownDeleting ? describeRemoval(t, shownDeleting, sizes) : undefined}
        confirmLabel={t.volumes.deletePermanently}
        confirmPhrase={
          shownDeleting ? volumeConfirmPhrase(shownDeleting, t.volumes.confirmWord) : undefined
        }
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

function describeRemoval(t: Strings, volume: VolumeSummary, sizes: Map<string, number>): string {
  const size = sizes.get(volume.Name);
  return t.volumes.removal(volume.Name, size !== undefined ? t.bytes(size) : null);
}

const useStyles = createStyles((theme) => ({
  list: { padding: theme.spacing(4), gap: theme.spacing(3) },
  header: { gap: theme.spacing(2) },
  summary: { color: theme.colors.textMuted, fontSize: 12 },
}));
