import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function DrawerLink({
  label,
  icon,
  active = false,
  tone = 'default',
  onPress,
}: {
  label: string;
  icon: IconName;
  active?: boolean;
  tone?: 'default' | 'danger';
  /** Absent when the destination doesn't exist yet: the entry is disabled. */
  onPress?: () => void;
}) {
  const disabled = !onPress;
  const color =
    tone === 'danger' ? theme.colors.danger : active ? theme.colors.accent : theme.colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.link,
        active && styles.linkActive,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.linkLabel, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // 48 pt minimum: the recommended touch target on both Android and iOS.
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(4),
    minHeight: theme.spacing(12),
    paddingHorizontal: theme.spacing(3),
    borderRadius: theme.radius.md,
  },
  linkActive: { backgroundColor: theme.colors.surfaceAlt },
  linkLabel: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.4 },
});
