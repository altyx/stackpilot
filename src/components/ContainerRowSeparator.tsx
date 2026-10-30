import { View } from 'react-native';
import { createStyles } from '../theme';

/**
 * The gap between cards comes from a separator, not a margin on the card:
 * `Link asChild` merges its child's style by object spread, and a
 * `Pressable` function style is lost there, margin included.
 */
export function ContainerRowSeparator() {
  const styles = useStyles();
  return <View style={styles.rowSeparator} />;
}

const useStyles = createStyles((theme) => ({
  rowSeparator: { height: theme.spacing(2) },
}));
