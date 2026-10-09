import { StyleSheet, Text, View } from 'react-native';
import type { ImageSummary } from '../api/types';
import { formatBytes, formatDate } from '../lib/format';
import { imageLabel, isDangling, shortImageId, type Usage } from '../lib/usage';
import { theme } from '../theme';
import { Card } from './Card';
import { IconButton } from './IconButton';
import { UsageBadge } from './UsageBadge';

export function ImageCard({
  usage,
  updateAvailable = false,
  onDelete,
}: {
  usage: Usage<ImageSummary>;
  /** Its registry has a newer version, per Portainer's indicator. */
  updateAvailable?: boolean;
  /** Offered on unused images only: Docker refuses to delete the others. */
  onDelete?: () => void;
}) {
  const { item: image, usedBy } = usage;
  return (
    <Card style={styles.card}>
      <View style={styles.content}>
        <View style={styles.cardHeader}>
          <Text style={styles.name} numberOfLines={2}>
            {imageLabel(image)}
          </Text>
          <UsageBadge usedBy={usedBy} />
        </View>

        <Text style={styles.meta}>
          {formatBytes(image.Size)} · {shortImageId(image.Id)} · {formatDate(image.Created)}
        </Text>

        {updateAvailable ? <Text style={styles.update}>New version available</Text> : null}

        {isDangling(image) ? <Text style={styles.dangling}>Untagged image (dangling)</Text> : null}

        {usedBy.length > 0 ? (
          <Text style={styles.usedBy} numberOfLines={2}>
            {usedBy.join(', ')}
          </Text>
        ) : null}

        {(image.RepoTags ?? []).length > 1 ? (
          <Text style={styles.meta}>{image.RepoTags!.length} tags</Text>
        ) : null}
      </View>

      {onDelete ? (
        <IconButton
          icon="trash-outline"
          variant="danger"
          accessibilityLabel={`Delete ${imageLabel(image)}`}
          onPress={onDelete}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(3) },
  content: { flex: 1, gap: theme.spacing(1) },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing(2) },
  name: { color: theme.colors.text, fontSize: 14, fontWeight: '600', flex: 1 },
  meta: { color: theme.colors.textMuted, fontSize: 12 },
  dangling: { color: theme.colors.warning, fontSize: 12 },
  update: { color: theme.colors.accent, fontSize: 12, fontWeight: '500' },
  usedBy: { color: theme.colors.text, fontSize: 12 },
});
