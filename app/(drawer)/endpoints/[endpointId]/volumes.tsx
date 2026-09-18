import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useEndpointParam } from '../../../../src/navigation/CurrentEndpoint';
import { useContainers, useVolumes } from '../../../../src/api/hooks';
import { EmptyState } from '../../../../src/components/EmptyState';
import { ErrorView } from '../../../../src/components/ErrorView';
import { Loader } from '../../../../src/components/Loader';
import { Segmented } from '../../../../src/components/Segmented';
import { VolumeCard } from '../../../../src/components/VolumeCard';
import { volumesWithUsage } from '../../../../src/lib/usage';
import { theme } from '../../../../src/theme';

type Filter = 'all' | 'used' | 'unused';

export default function VolumesScreen() {
  const id = useEndpointParam();

  const volumes = useVolumes(id);
  const containers = useContainers(id);
  const [filter, setFilter] = useState<Filter>('all');

  const usages = useMemo(
    () => volumesWithUsage(volumes.data ?? [], containers.data ?? []),
    [volumes.data, containers.data],
  );

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

  const unusedCount = usages.filter((usage) => usage.usedBy.length === 0).length;

  return (
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
          }}
          tintColor={theme.colors.accent}
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.summary}>
            {usages.length} volume{usages.length > 1 ? 's' : ''} · {unusedCount} inutilisé
            {unusedCount > 1 ? 's' : ''}
          </Text>
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
      renderItem={({ item }) => <VolumeCard usage={item} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: theme.spacing(4), gap: theme.spacing(3) },
  header: { gap: theme.spacing(2) },
  summary: { color: theme.colors.textMuted, fontSize: 12 },
});
