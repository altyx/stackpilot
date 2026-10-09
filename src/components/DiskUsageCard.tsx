import { StyleSheet, Text, View } from 'react-native';
import { useDiskUsage } from '../api/hooks';
import { summarizeDiskUsage } from '../lib/disk';
import { formatBytes } from '../lib/format';
import { theme } from '../theme';
import { Card } from './Card';
import { InlineStatus } from './InlineStatus';

export function DiskUsageCard({ endpointId }: { endpointId: number }) {
  const { data, error, refetch } = useDiskUsage(endpointId);

  if (error || !data) {
    return (
      <Card>
        <InlineStatus
          loading="Measuring disk usage…"
          error={error}
          onRetry={() => void refetch()}
        />
      </Card>
    );
  }

  const summary = summarizeDiskUsage(data);
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.total}>{formatBytes(summary.total)}</Text>
        <Text style={styles.muted}>used by Docker</Text>
      </View>

      {summary.total > 0 ? (
        <View style={styles.bar} accessibilityElementsHidden importantForAccessibility="no">
          {summary.categories.map((category, index) =>
            category.size > 0 ? (
              <View
                key={category.key}
                style={{ flex: category.size, backgroundColor: theme.colors.series[index] }}
              />
            ) : null,
          )}
        </View>
      ) : null}

      <View style={styles.legend}>
        {summary.categories.map((category, index) => (
          <View key={category.key} style={styles.legendRow}>
            <View style={[styles.swatch, { backgroundColor: theme.colors.series[index] }]} />
            <Text style={styles.legendLabel}>{category.label}</Text>
            <Text style={styles.legendValue}>{formatBytes(category.size)}</Text>
          </View>
        ))}
      </View>

      {summary.reclaimable > 0 ? (
        <Text style={styles.reclaimable}>
          {formatBytes(summary.reclaimable)} reclaimable by removing what is no longer used.
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing(3) },
  header: { flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing(2) },
  total: { color: theme.colors.text, fontSize: 24, fontWeight: '700' },
  muted: { color: theme.colors.textMuted, fontSize: 13 },
  bar: {
    flexDirection: 'row',
    height: theme.spacing(3),
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
    gap: 2,
    backgroundColor: theme.colors.surfaceAlt,
  },
  legend: { gap: theme.spacing(2) },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2) },
  swatch: { width: theme.spacing(2.5), height: theme.spacing(2.5), borderRadius: 2 },
  legendLabel: { color: theme.colors.text, fontSize: 13, flex: 1 },
  legendValue: { color: theme.colors.textMuted, fontSize: 13, fontVariant: ['tabular-nums'] },
  reclaimable: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17 },
});
