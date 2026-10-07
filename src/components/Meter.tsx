import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

/** Past these shares the bar turns warning, then danger: room is running out. */
const WARNING_RATIO = 0.75;
const DANGER_RATIO = 0.9;

/** Labelled gauge for a share of a capacity (CPU, memory). */
export function Meter({ label, value, ratio }: { label: string; value: string; ratio: number }) {
  const clamped = Math.min(Math.max(ratio, 0), 1);
  const color =
    clamped >= DANGER_RATIO
      ? theme.colors.danger
      : clamped >= WARNING_RATIO
        ? theme.colors.warning
        : theme.colors.accent;
  return (
    <View
      style={styles.meter}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${label} : ${value}`}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      <View style={styles.track}>
        <View
          testID="meter-fill"
          style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: color }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  meter: { gap: theme.spacing(1.5) },
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing(2) },
  label: { color: theme.colors.text, fontSize: 13, fontWeight: '600' },
  value: { color: theme.colors.textMuted, fontSize: 13 },
  track: {
    height: theme.spacing(2),
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceAlt,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: theme.radius.sm },
});
