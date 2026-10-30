import type { ReactNode } from 'react';
import { View } from 'react-native';
import { createStyles } from '../theme';

export function SheetActions({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <View style={styles.actions}>{children}</View>;
}

const useStyles = createStyles((theme) => ({
  actions: { gap: theme.spacing(2) },
}));
