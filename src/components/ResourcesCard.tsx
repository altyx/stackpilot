import { Text, View } from 'react-native';
import { useContainerStats, useDockerInfo } from '../api/hooks';
import type { ContainerSummary } from '../api/types';
import { useTranslation } from 'react-i18next';
import { summarizeResources } from '../lib/resources';
import { createStyles } from '../theme';
import { Card } from './Card';
import { InlineStatus } from './InlineStatus';
import { Meter } from './Meter';
import { useFormat } from '../i18n/format';

/** The heaviest containers are what to look at when the host struggles. */
const TOP_COUNT = 5;

export function ResourcesCard({
  endpointId,
  running,
}: {
  endpointId: number;
  /** Stopped containers use nothing: only running ones are sampled. */
  running: ContainerSummary[];
}) {
  const styles = useStyles();
  const { t } = useTranslation();
  const f = useFormat();
  const info = useDockerInfo(endpointId);
  const stats = useContainerStats(endpointId, running);

  if (running.length === 0) {
    return (
      <Card>
        <Text style={styles.muted}>{t('overview.nothingToMeasure')}</Text>
      </Card>
    );
  }
  const error = info.error ?? stats.error;
  if (error || !info.data || !stats.data) {
    return (
      <Card>
        <InlineStatus
          loading={t('overview.measuringUsage')}
          error={error}
          onRetry={() => {
            void info.refetch();
            void stats.refetch();
          }}
        />
      </Card>
    );
  }

  const summary = summarizeResources(info.data, stats.data);
  const top = summary.containers.slice(0, TOP_COUNT);
  const missing = running.length - stats.data.length;

  return (
    <Card style={styles.card}>
      <Meter
        label={t('overview.cpu')}
        value={t('overview.cpuValue', {
          percent: f.percent(summary.cpuPercent),
          cores: t('counts.core', { count: info.data.NCPU }),
        })}
        ratio={summary.cpuPercent / 100}
      />
      <Meter
        label={t('overview.memory')}
        value={`${f.bytes(summary.memoryUsed)} / ${f.bytes(summary.memoryTotal)}`}
        ratio={summary.memoryTotal > 0 ? summary.memoryUsed / summary.memoryTotal : 0}
      />

      <View style={styles.top}>
        <Text style={styles.topTitle}>{t('overview.topConsumers')}</Text>
        {top.map((usage) => (
          <View key={usage.id} style={styles.topRow}>
            <Text style={styles.topName} numberOfLines={1}>
              {usage.name}
            </Text>
            <Text style={styles.topValue}>{usage.cpu === null ? '—' : f.percent(usage.cpu)}</Text>
            <Text style={[styles.topValue, styles.topMemory]}>
              {usage.memory === null ? '—' : f.bytes(usage.memory)}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.footnote}>
        {t('overview.resourcesFootnote')}
        {missing > 0 ? ` ${t('overview.noResponse', { count: missing })}` : ''}
      </Text>
    </Card>
  );
}

const useStyles = createStyles((theme) => ({
  card: { gap: theme.spacing(4) },
  muted: { color: theme.colors.textMuted, fontSize: 13 },
  top: { gap: theme.spacing(2) },
  topTitle: { color: theme.colors.text, fontSize: 13, fontWeight: '600' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(3) },
  topName: { color: theme.colors.text, fontSize: 13, flex: 1 },
  topValue: {
    color: theme.colors.textMuted,
    fontSize: 13,
    minWidth: theme.spacing(12),
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  topMemory: { minWidth: theme.spacing(16) },
  footnote: { color: theme.colors.textMuted, fontSize: 11, lineHeight: 16 },
}));
