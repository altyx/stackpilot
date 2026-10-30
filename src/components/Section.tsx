import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { createStyles } from '../theme';

export function Section({ title, children }: { title: string; children: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  section: { gap: theme.spacing(2) },
  sectionTitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: theme.spacing(1),
  },
}));
