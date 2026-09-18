import { StyleSheet, View } from 'react-native';
import { theme } from '../theme';

export function Centered({ children }: { children: React.ReactNode }) {
  return <View style={styles.centered}>{children}</View>;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(6),
    gap: theme.spacing(3),
  },
});
