import { View } from 'react-native';
import { createStyles } from '../theme';

export function Centered({ children }: { children: React.ReactNode }) {
  const styles = useStyles();
  return <View style={styles.centered}>{children}</View>;
}

const useStyles = createStyles((theme) => ({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(6),
    gap: theme.spacing(3),
  },
}));
