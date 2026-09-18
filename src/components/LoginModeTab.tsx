import { StyleSheet, Text } from 'react-native';
import { theme } from '../theme';

export function LoginModeTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Text
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.modeTab, active && styles.modeTabActive]}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  modeTab: {
    flex: 1,
    textAlign: 'center',
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: theme.spacing(2.5),
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
  },
  modeTabActive: { backgroundColor: theme.colors.accent, color: theme.colors.text },
});
