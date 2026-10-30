import { StyleSheet, Text, View } from 'react-native';
import { useStrings } from '../i18n';
import type { ContainerCounts } from '../lib/overview';
import { createStyles, useTheme } from '../theme';
import { Card } from './Card';

/**
 * Containers by healthcheck result, side by side. Kept apart from the tiles:
 * three figures read better in columns than squeezed into a caption.
 */
export function HealthCounts({ counts }: { counts: ContainerCounts }) {
  const theme = useTheme();
  const styles = useStyles();
  const t = useStrings();
  const columns = [
    { label: t.overview.healthy, value: counts.healthy, color: theme.colors.success },
    {
      label: t.overview.unhealthy,
      value: counts.unhealthy,
      color: counts.unhealthy > 0 ? theme.colors.danger : theme.colors.textMuted,
    },
    { label: t.overview.noHealthcheck, value: counts.unchecked, color: theme.colors.textMuted },
  ];
  return (
    <Card style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>
        {t.overview.healthTitle}
      </Text>
      <View style={styles.columns}>
        {columns.map((column, index) => (
          <View
            key={column.label}
            accessible
            accessibilityLabel={`${column.label}: ${column.value}`}
            style={[styles.column, index === 0 ? styles.columnFirst : styles.columnDivided]}>
            <Text style={[styles.value, { color: column.color }]}>{column.value}</Text>
            <Text style={styles.label} numberOfLines={2}>
              {column.label}
            </Text>
          </View>
        ))}
      </View>
      {counts.starting > 0 ? (
        <Text style={styles.footnote}>{t.overview.starting(counts.starting)}</Text>
      ) : null}
    </Card>
  );
}

const useStyles = createStyles((theme) => ({
  card: { gap: theme.spacing(3) },
  title: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '500' },
  columns: { flexDirection: 'row' },
  column: { flex: 1, gap: theme.spacing(1), paddingHorizontal: theme.spacing(2) },
  columnFirst: { paddingLeft: 0 },
  columnDivided: {
    borderLeftColor: theme.colors.border,
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  value: { fontSize: 22, fontWeight: '500', fontVariant: ['tabular-nums'] },
  label: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 16 },
  footnote: { color: theme.colors.textMuted, fontSize: 11, lineHeight: 16 },
}));
