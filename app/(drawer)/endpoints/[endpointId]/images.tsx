import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useEndpointParam } from '../../../../src/navigation/CurrentEndpoint';
import { useContainers, useImages } from '../../../../src/api/hooks';
import type { ImageSummary } from '../../../../src/api/types';
import {
  Card,
  EmptyState,
  ErrorView,
  Loader,
  Segmented,
  UsageBadge,
} from '../../../../src/components/ui';
import { formatBytes, formatDate } from '../../../../src/lib/format';
import {
  imageLabel,
  imagesWithUsage,
  isDangling,
  reclaimableBytes,
  shortImageId,
  type Usage,
} from '../../../../src/lib/usage';
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
        filter === 'all' ? true : filter === 'used' ? usage.usedBy.length > 0 : usage.usedBy.length === 0,
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
      ListEmptyComponent={<EmptyState title="Aucune image" subtitle="Aucun résultat pour ce filtre." />}
      renderItem={({ item }) => <ImageCard usage={item} />}
    />
  );
}

function ImageCard({ usage }: { usage: Usage<ImageSummary> }) {
  const { item: image, usedBy } = usage;
  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.name} numberOfLines={2}>
          {imageLabel(image)}
        </Text>
        <UsageBadge usedBy={usedBy} />
      </View>

      <Text style={styles.meta}>
        {formatBytes(image.Size)} · {shortImageId(image.Id)} · {formatDate(image.Created)}
      </Text>

      {isDangling(image) ? (
        <Text style={styles.dangling}>Image sans tag (dangling)</Text>
      ) : null}

      {usedBy.length > 0 ? (
        <Text style={styles.usedBy} numberOfLines={2}>
          {usedBy.join(', ')}
        </Text>
      ) : null}

      {(image.RepoTags ?? []).length > 1 ? (
        <Text style={styles.meta}>{image.RepoTags!.length} tags</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { padding: theme.spacing(4), gap: theme.spacing(3) },
  header: { gap: theme.spacing(2) },
  summary: { color: theme.colors.textMuted, fontSize: 12 },
  card: { gap: theme.spacing(1) },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing(2) },
  name: { color: theme.colors.text, fontSize: 14, fontWeight: '600', flex: 1 },
  meta: { color: theme.colors.textMuted, fontSize: 12 },
  dangling: { color: theme.colors.warning, fontSize: 12 },
  usedBy: { color: theme.colors.text, fontSize: 12 },
});
