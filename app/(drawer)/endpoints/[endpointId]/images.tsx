import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useEndpointParam } from '../../../../src/navigation/CurrentEndpoint';
import { useContainers, useImages } from '../../../../src/api/hooks';
import { EmptyState } from '../../../../src/components/EmptyState';
import { ErrorView } from '../../../../src/components/ErrorView';
import { ImageCard } from '../../../../src/components/ImageCard';
import { Loader } from '../../../../src/components/Loader';
import { Segmented } from '../../../../src/components/Segmented';
import { formatBytes } from '../../../../src/lib/format';
import { imagesWithUsage, reclaimableBytes } from '../../../../src/lib/usage';
import { theme } from '../../../../src/theme';

type Filter = 'all' | 'used' | 'unused';

export default function ImagesScreen() {
  const id = useEndpointParam();

  const images = useImages(id);
  const containers = useContainers(id);
  const [filter, setFilter] = useState<Filter>('all');

  const usages = useMemo(
    () => imagesWithUsage(images.data ?? [], containers.data ?? []),
    [images.data, containers.data],
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

  if (images.isPending || containers.isPending) return <Loader label="Chargement des images…" />;
  const error = images.error ?? containers.error;
  if (error) {
    return (
      <ErrorView
        error={error}
        onRetry={() => {
          void images.refetch();
          void containers.refetch();
        }}
      />
    );
  }

  const unusedCount = usages.filter((usage) => usage.usedBy.length === 0).length;
  const reclaimable = reclaimableBytes(usages);

  return (
    <FlatList
      data={visible}
      keyExtractor={(usage) => usage.item.Id}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={images.isRefetching || containers.isRefetching}
          onRefresh={() => {
            void images.refetch();
            void containers.refetch();
          }}
          tintColor={theme.colors.accent}
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.summary}>
            {usages.length} image{usages.length > 1 ? 's' : ''} · {unusedCount} inutilisée
            {unusedCount > 1 ? 's' : ''}
            {reclaimable > 0 ? ` · ${formatBytes(reclaimable)} récupérables` : ''}
          </Text>
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'Toutes' },
              { value: 'used', label: 'Utilisées' },
              { value: 'unused', label: 'Inutilisées' },
            ]}
          />
        </View>
      }
      ListEmptyComponent={
        <EmptyState title="Aucune image" subtitle="Aucun résultat pour ce filtre." />
      }
      renderItem={({ item }) => <ImageCard usage={item} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: theme.spacing(4), gap: theme.spacing(3) },
  header: { gap: theme.spacing(2) },
  summary: { color: theme.colors.textMuted, fontSize: 12 },
});
