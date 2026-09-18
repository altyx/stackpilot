import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../theme';

export function SheetActions({ children }: { children: ReactNode }) {
  return <View style={styles.actions}>{children}</View>;
}

const styles = StyleSheet.create({
  actions: { gap: theme.spacing(2) },
});
