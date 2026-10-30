import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { StackKind } from '../lib/stacks';
import { createStyles } from '../theme';

/** "Compose" / "Swarm" for stacks Portainer manages, "External" otherwise. */
export function StackKindBadge({ kind }: { kind: StackKind }) {
  const styles = useStyles();
  const { t } = useTranslation();
  return (
    <Text style={[styles.badge, kind === 'external' ? styles.external : styles.managed]}>
      {t(`stacks.kinds.${kind}`)}
    </Text>
  );
}

const useStyles = createStyles((theme) => ({
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
}));
