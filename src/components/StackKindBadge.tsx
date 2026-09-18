import { StyleSheet, Text } from 'react-native';
import { STACK_KIND_LABELS, type StackKind } from '../lib/stacks';
import { theme } from '../theme';

/** "Compose" / "Swarm" for stacks Portainer manages, "Externe" otherwise. */
export function StackKindBadge({ kind }: { kind: StackKind }) {
  return (
    <Text style={[styles.badge, kind === 'external' ? styles.external : styles.managed]}>
      {STACK_KIND_LABELS[kind]}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
  },
  managed: { backgroundColor: theme.colors.accentDim, color: theme.colors.text },
  external: { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.textMuted },
});
