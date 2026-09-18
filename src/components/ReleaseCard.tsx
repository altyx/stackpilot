import { StyleSheet, Text, View } from 'react-native';
import type { Release } from '../changelog';
import { theme } from '../theme';
import { Card } from './Card';

export function ReleaseCard({ release, installed }: { release: Release; installed: boolean }) {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.version}>
          Version {release.version}
        </Text>
        {installed ? <Text style={styles.badge}>Installée</Text> : null}
      </View>
      <Text style={styles.date}>{release.date}</Text>
      {release.changes.map((change) => (
        <View key={change} style={styles.change}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.changeText}>{change}</Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing(2) },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2) },
  version: { color: theme.colors.text, fontSize: 16, fontWeight: '700', flex: 1 },
  badge: {
    backgroundColor: theme.colors.accentDim,
    borderRadius: theme.radius.sm,
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
  },
  date: { color: theme.colors.textMuted, fontSize: 12 },
  change: { flexDirection: 'row', gap: theme.spacing(2), alignItems: 'flex-start' },
  bullet: { color: theme.colors.accent, fontSize: 14, lineHeight: 20 },
  changeText: { color: theme.colors.text, fontSize: 14, lineHeight: 20, flex: 1 },
});
