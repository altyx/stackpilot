import { Pressable, StyleSheet, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../theme';

export function SettingsChoiceRow({
  label,
  selected,
  first,
  onPress,
}: {
  label: string;
  selected: boolean;
  first: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.row, !first && styles.rowDivided, pressed && styles.pressed]}>
      <Text style={[styles.rowLabel, styles.choiceLabel, selected && styles.choiceLabelSelected]}>
        {label}
      </Text>
      {selected ? <Ionicons name="checkmark" size={20} color={theme.colors.accent} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(3),
    minHeight: theme.spacing(12),
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(3),
  },
  rowDivided: { borderTopColor: theme.colors.border, borderTopWidth: StyleSheet.hairlineWidth },
  rowLabel: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  choiceLabel: { flex: 1, fontWeight: '500' },
  choiceLabelSelected: { color: theme.colors.accent, fontWeight: '600' },
  pressed: { opacity: 0.75 },
});
