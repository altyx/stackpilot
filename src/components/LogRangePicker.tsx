import { ScrollView, StyleSheet, Text } from 'react-native';
import { LOG_RANGES, type LogRange } from '../lib/logs';
import { theme } from '../theme';

/** Scrolling chips: six ranges don't fit a segmented control on a phone. */
export function LogRangePicker({
  value,
  onChange,
}: {
  value: LogRange;
  onChange: (next: LogRange) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}>
      {LOG_RANGES.map((range) => {
        const selected = range.key === value.key;
        return (
          <Text
            key={range.key}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(range)}
            style={[styles.chip, selected && styles.chipSelected]}>
            {range.label}
          </Text>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chips: { gap: theme.spacing(2) },
  chip: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(1.5),
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceAlt,
    overflow: 'hidden',
  },
  chipSelected: { backgroundColor: theme.colors.accentFill, color: theme.colors.text },
});
