import { StyleSheet, Text, View } from 'react-native';
import type { VolumeSummary } from '../api/types';
import { formatDate } from '../lib/format';
import type { Usage } from '../lib/usage';
import { theme } from '../theme';
import { Card } from './Card';
import { UsageBadge } from './UsageBadge';

export function VolumeCard({ usage }: { usage: Usage<VolumeSummary> }) {
  const { item: volume, usedBy } = usage;
  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.name} numberOfLines={2}>
          {volume.Name}
        </Text>
        <UsageBadge usedBy={usedBy} />
      </View>

      <Text style={styles.meta}>
        {volume.Driver}
        {volume.CreatedAt ? ` · ${formatDate(volume.CreatedAt)}` : ''}
      </Text>

      {usedBy.length > 0 ? (
        <Text style={styles.usedBy} numberOfLines={2}>
          {usedBy.join(', ')}
        </Text>
      ) : null}

      <Text style={styles.mountpoint} numberOfLines={1}>
        {volume.Mountpoint}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing(1) },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing(2) },
  name: { color: theme.colors.text, fontSize: 14, fontWeight: '600', flex: 1 },
  meta: { color: theme.colors.textMuted, fontSize: 12 },
  usedBy: { color: theme.colors.text, fontSize: 12 },
  mountpoint: { color: theme.colors.textMuted, fontSize: 11 },
});
