import { StyleSheet, Text, View } from 'react-native';
import type { VolumeSummary } from '../api/types';
import { formatBytes, formatDate } from '../lib/format';
import { isAnonymousVolume, type Usage } from '../lib/usage';
import { theme } from '../theme';
import { Card } from './Card';
import { IconButton } from './IconButton';
import { UsageBadge } from './UsageBadge';

export function VolumeCard({
  usage,
  size,
  onDelete,
}: {
  usage: Usage<VolumeSummary>;
  /** From `docker system df`, slower to load than the list: shown once known. */
  size?: number;
  /** Offered on unused volumes only: Docker refuses to delete the others. */
  onDelete?: () => void;
}) {
  const { item: volume, usedBy } = usage;
  const meta = [
    volume.Driver,
    size !== undefined ? formatBytes(size) : null,
    volume.CreatedAt ? formatDate(volume.CreatedAt) : null,
    isAnonymousVolume(volume) ? 'anonyme' : null,
  ].filter(Boolean);
  return (
    <Card style={styles.card}>
      <View style={styles.content}>
        <View style={styles.cardHeader}>
          <Text style={styles.name} numberOfLines={2}>
            {volume.Name}
          </Text>
          <UsageBadge usedBy={usedBy} />
        </View>

        <Text style={styles.meta}>{meta.join(' · ')}</Text>

        {usedBy.length > 0 ? (
          <Text style={styles.usedBy} numberOfLines={2}>
            {usedBy.join(', ')}
          </Text>
        ) : null}

        <Text style={styles.mountpoint} numberOfLines={1}>
          {volume.Mountpoint}
        </Text>
      </View>

      {onDelete ? (
        <IconButton
          icon="trash-outline"
          variant="danger"
          accessibilityLabel={`Supprimer ${volume.Name}`}
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
  usedBy: { color: theme.colors.text, fontSize: 12 },
  mountpoint: { color: theme.colors.textMuted, fontSize: 11 },
});
