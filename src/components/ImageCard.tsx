import { StyleSheet, Text, View } from 'react-native';
import type { ImageSummary } from '../api/types';
import { formatBytes, formatDate } from '../lib/format';
import { imageLabel, isDangling, shortImageId, type Usage } from '../lib/usage';
import { theme } from '../theme';
import { Card } from './Card';
import { UsageBadge } from './UsageBadge';

export function ImageCard({ usage }: { usage: Usage<ImageSummary> }) {
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

      {isDangling(image) ? <Text style={styles.dangling}>Image sans tag (dangling)</Text> : null}

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
  card: { gap: theme.spacing(1) },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing(2) },
  name: { color: theme.colors.text, fontSize: 14, fontWeight: '600', flex: 1 },
  meta: { color: theme.colors.textMuted, fontSize: 12 },
  dangling: { color: theme.colors.warning, fontSize: 12 },
  usedBy: { color: theme.colors.text, fontSize: 12 },
});
