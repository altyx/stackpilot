import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { theme } from '../theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const SIZE = 36;
/** Brings the touch target to the 44 pt platforms recommend. */
const HIT_SLOP = (44 - SIZE) / 2;

/**
 * Icon-only action inside a list item. The icon carries no text, so the
 * accessibility label is required: it is all a screen reader announces.
 */
export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = 'neutral',
  disabled,
}: {
  icon: IconName;
  accessibilityLabel: string;
  onPress: () => void;
  variant?: 'neutral' | 'danger';
  disabled?: boolean;
}) {
  const danger = variant === 'danger';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={HIT_SLOP}
      style={({ pressed }) => [
        styles.button,
        danger ? styles.danger : styles.neutral,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <Ionicons
        name={icon}
        size={18}
        color={danger ? theme.colors.danger : theme.colors.textMuted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  neutral: { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border },
  danger: {
    backgroundColor: theme.colors.dangerSubtle,
    borderColor: theme.colors.dangerSubtleBorder,
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
});
