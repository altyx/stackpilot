import { StyleSheet, Text } from 'react-native';
import { theme } from '../theme';
import { Centered } from './Centered';

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Centered>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}
    </Centered>
  );
}

const styles = StyleSheet.create({
  emptyTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  muted: { color: theme.colors.textMuted, fontSize: 14, textAlign: 'center' },
});
