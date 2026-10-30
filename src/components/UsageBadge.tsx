import { Text } from 'react-native';
import { useStrings } from '../i18n';
import { createStyles } from '../theme';

/** "used by N" / "unused" badge. */
export function UsageBadge({ usedBy, kind }: { usedBy: string[]; kind: 'image' | 'volume' }) {
  const styles = useStyles();
  const t = useStrings();
  const labels = t.common.usage[kind];
  const used = usedBy.length > 0;
  return (
    <Text style={[styles.usageBadge, used ? styles.usageUsed : styles.usageUnused]}>
      {used ? labels.used(usedBy.length) : labels.unused}
    </Text>
  );
}

const useStyles = createStyles((theme) => ({
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
}));
