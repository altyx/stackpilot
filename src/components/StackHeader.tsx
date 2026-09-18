import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { StackSection } from '../lib/stacks';
import { theme } from '../theme';

export function StackHeader({
  section,
  busy,
  disabled,
  onPressActions,
}: {
  section: StackSection;
  busy: boolean;
  disabled: boolean;
  onPressActions: (section: StackSection) => void;
}) {
  const { title, members, running } = section;
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle} numberOfLines={1}>
        {title}
      </Text>
      <Text style={[styles.sectionCount, running === members.length && styles.sectionCountFull]}>
        {running}/{members.length} en cours
      </Text>
      {section.ungrouped ? null : busy ? (
        <ActivityIndicator color={theme.colors.accent} size="small" style={styles.sectionAction} />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Actions sur la stack ${title}`}
          accessibilityState={{ disabled }}
          disabled={disabled}
          hitSlop={12}
          onPress={() => onPressActions(section)}
          style={({ pressed }) => [styles.sectionAction, (pressed || disabled) && styles.pressed]}>
          <Ionicons name="ellipsis-horizontal" size={18} color={theme.colors.accent} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Fond opaque obligatoire : l'en-tête reste collé au-dessus des cartes.
  sectionHeader: {
    backgroundColor: theme.colors.bg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(3),
    paddingTop: theme.spacing(3),
    paddingBottom: theme.spacing(2),
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  sectionCount: { color: theme.colors.textMuted, fontSize: 12, marginLeft: 'auto' },
  sectionCountFull: { color: theme.colors.success },
  sectionAction: { width: 28, alignItems: 'flex-end' },
  pressed: { opacity: 0.75 },
});
