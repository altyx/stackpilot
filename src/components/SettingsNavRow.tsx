import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/**
 * Les lignes sont séparées par une bordure haute plutôt que par un séparateur
 * intercalé : `first` évite un trait juste sous le bord de la carte.
 */
export function SettingsNavRow({
  icon,
  label,
  hint,
  external = false,
  first = false,
  onPress,
}: {
  icon: IconName;
  label: string;
  hint?: string;
  /** Sort de l'application : l'icône de droite le dit avant le tap. */
  external?: boolean;
  first?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={external ? 'link' : 'button'}
      onPress={onPress}
      style={({ pressed }) => [styles.row, !first && styles.rowDivided, pressed && styles.pressed]}>
      <Ionicons name={icon} size={20} color={theme.colors.accent} />
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <Ionicons
        name={external ? 'open-outline' : 'chevron-forward'}
        size={18}
        color={theme.colors.textMuted}
      />
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
  rowText: { flex: 1, gap: theme.spacing(0.5) },
  rowLabel: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  rowHint: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17 },
  pressed: { opacity: 0.75 },
});
