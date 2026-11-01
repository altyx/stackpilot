import { Text, View } from 'react-native';
import { useDiskUsage } from '../api/hooks';
import { useTranslation } from 'react-i18next';
import { summarizeDiskUsage } from '../lib/disk';
import { createStyles, useTheme } from '../theme';
import { Card } from './Card';
import { InlineStatus } from './InlineStatus';
import { useFormat } from '../i18n/format';

export function DiskUsageCard({ endpointId }: { endpointId: number }) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useTranslation();
  const f = useFormat();
  const { data, error, refetch } = useDiskUsage(endpointId);

  if (error || !data) {
    return (
      <Card>
        <InlineStatus
          loading={t('overview.measuringDisk')}
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
        <Text style={styles.total}>{f.bytes(summary.total)}</Text>
        <Text style={styles.muted}>{t('overview.usedByDocker')}</Text>
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
            <Text style={styles.legendLabel}>{t(`overview.diskCategories.${category.key}`)}</Text>
            <Text style={styles.legendValue}>{f.bytes(category.size)}</Text>
          </View>
        ))}
      </View>

      {summary.reclaimable > 0 ? (
        <Text style={styles.reclaimable}>
          {t('overview.reclaimable', { size: f.bytes(summary.reclaimable) })}
        </Text>
      ) : null}
    </Card>
  );
}

const useStyles = createStyles((theme) => ({
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
}));
