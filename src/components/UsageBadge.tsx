import { StyleSheet, Text } from 'react-native';
import { theme } from '../theme';

/** "used by N" / "unused" badge. */
export function UsageBadge({ usedBy }: { usedBy: string[] }) {
  const used = usedBy.length > 0;
  return (
    <Text style={[styles.usageBadge, used ? styles.usageUsed : styles.usageUnused]}>
      {used ? `utilisé · ${usedBy.length}` : 'inutilisé'}
    </Text>
  );
}

const styles = StyleSheet.create({
  usageBadge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
  },
  usageUsed: { backgroundColor: theme.colors.accentDim, color: theme.colors.text },
  usageUnused: { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.warning },
});
