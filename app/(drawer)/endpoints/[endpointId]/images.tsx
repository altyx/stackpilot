import { useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useEndpointParam } from '../../../../src/navigation/CurrentEndpoint';
import {
  useContainers,
  useImages,
  usePruneImages,
  useRemoveImage,
} from '../../../../src/api/hooks';
import type { ImageDeleteItem, ImagePruneScope, ImageSummary } from '../../../../src/api/types';
import { Button } from '../../../../src/components/Button';
import { ConfirmSheet } from '../../../../src/components/ConfirmSheet';
import { EmptyState } from '../../../../src/components/EmptyState';
import { ErrorView } from '../../../../src/components/ErrorView';
import { ImageCard } from '../../../../src/components/ImageCard';
import { ImagePruneSheet } from '../../../../src/components/ImagePruneSheet';
import { Loader } from '../../../../src/components/Loader';
import { Segmented } from '../../../../src/components/Segmented';
import { useLatched } from '../../../../src/components/useLatched';
import { formatBytes } from '../../../../src/lib/format';
import {
  countDeletedImages,
  imageLabel,
  imagesWithUsage,
  pruneCandidates,
  reclaimableBytes,
} from '../../../../src/lib/usage';
import { theme } from '../../../../src/theme';

type Filter = 'all' | 'used' | 'unused';

export default function ImagesScreen() {
  const id = useEndpointParam();

  const images = useImages(id);
  const containers = useContainers(id);
  const remove = useRemoveImage(id);
  const prune = usePruneImages(id);
  const [filter, setFilter] = useState<Filter>('all');
  const [pruning, setPruning] = useState(false);
  const [deleting, setDeleting] = useState<ImageSummary | null>(null);
  const shownDeleting = useLatched(deleting);

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
  const busy = remove.isPending || prune.isPending;

  function refetch() {
    void images.refetch();
    void containers.refetch();
  }

  function removeImage(image: ImageSummary) {
    // Several tags on one image make Docker refuse without force; the image
    // is unused, so forcing only drops those extra tags along with it.
    const force = (image.RepoTags ?? []).length > 1;
    remove.mutate(
      { imageId: image.Id, force },
      {
        onError: (e) =>
          Alert.alert(
            'Suppression échouée',
            e instanceof Error ? e.message : "L'image n'a pas pu être supprimée.",
          ),
      },
    );
  }

  function runPrune(scope: ImagePruneScope) {
    const candidates = pruneCandidates(usages, scope);
    prune.mutate(scope, {
      onSuccess: ({ deleted, spaceReclaimed }) =>
        Alert.alert('Nettoyage terminé', describePrune(candidates, deleted, spaceReclaimed)),
      onError: (e) =>
        Alert.alert(
          'Nettoyage échoué',
          e instanceof Error ? e.message : "Les images n'ont pas pu être supprimées.",
        ),
    });
  }

  return (
    <>
      <FlatList
        data={visible}
        keyExtractor={(usage) => usage.item.Id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={images.isRefetching || containers.isRefetching}
            onRefresh={refetch}
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
            {unusedCount > 0 ? (
              <Button
                label="Nettoyer les images"
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
        renderItem={({ item }) => (
          <ImageCard
            usage={item}
            onDelete={item.usedBy.length === 0 && !busy ? () => setDeleting(item.item) : undefined}
          />
        )}
      />
      <ImagePruneSheet
        visible={pruning}
        usages={usages}
        onConfirm={runPrune}
        onClose={() => setPruning(false)}
      />
      <ConfirmSheet
        visible={deleting !== null}
        title="Supprimer l'image ?"
        message={shownDeleting ? describeRemoval(shownDeleting) : undefined}
        confirmLabel="Supprimer"
        destructive
        onConfirm={() => {
          const image = deleting;
          setDeleting(null);
          if (image) removeImage(image);
        }}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

function describeRemoval(image: ImageSummary): string {
  const tags = (image.RepoTags ?? []).length;
  return (
    `${imageLabel(image)} (${formatBytes(image.Size)}) sera supprimée de l'environnement` +
    (tags > 1 ? `, avec ses ${tags} tags. ` : '. ') +
    'Il faudra la retélécharger pour la réutiliser.'
  );
}

function describePrune(
  candidates: ImageSummary[],
  deleted: ImageDeleteItem[],
  reclaimed: number,
): string {
  const count = countDeletedImages(candidates, deleted);
  if (count === 0 && reclaimed === 0) return "Aucune image n'a été supprimée.";
  const images = `${count} image${count > 1 ? 's' : ''} supprimée${count > 1 ? 's' : ''}`;
  return `${images} · ${formatBytes(reclaimed)} libérés.`;
}

const styles = StyleSheet.create({
  list: { padding: theme.spacing(4), gap: theme.spacing(3) },
  header: { gap: theme.spacing(2) },
  summary: { color: theme.colors.textMuted, fontSize: 12 },
});
