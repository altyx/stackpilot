import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Text
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && styles.segmentActive]}>
            {option.label}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segmented: { flexDirection: 'row', gap: theme.spacing(2) },
  segment: {
    flex: 1,
    textAlign: 'center',
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    paddingVertical: theme.spacing(2),
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceAlt,
    overflow: 'hidden',
  },
  segmentActive: { backgroundColor: theme.colors.accent, color: theme.colors.text },
});
