import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/**
 * One choice in an action sheet: an icon, a verb, and what it does. Lighter
 * than a full-width button, so rarer actions don't shout.
 */
export function ActionRow({
  icon,
  label,
  hint,
  tone = 'default',
  onPress,
}: {
  icon: IconName;
  label: string;
  hint?: string;
  tone?: 'default' | 'danger';
  onPress: () => void;
}) {
  const color = tone === 'danger' ? theme.colors.danger : theme.colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.icon, tone === 'danger' && styles.iconDanger]}>
        <Ionicons name={icon} size={18} color={tone === 'danger' ? color : theme.colors.accent} />
      </View>
      <View style={styles.text}>
        <Text style={[styles.label, { color }]}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(3),
    paddingVertical: theme.spacing(2.5),
  },
  pressed: { opacity: 0.6 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDanger: { backgroundColor: theme.colors.dangerSubtle },
  text: { flex: 1, gap: theme.spacing(0.5) },
  label: { fontSize: 15, fontWeight: '600' },
  hint: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17 },
});
