import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CHANGELOG, type Release } from '../src/changelog';
import { Card } from '../src/components/ui';
import { appVersion } from '../src/lib/appInfo';
import { RELEASES_URL } from '../src/lib/support';
import { theme } from '../src/theme';

/**
 * Notes de version embarquées : elles décrivent la version installée, même hors
 * ligne, et sans appel à GitHub.
 */
export default function ChangelogScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      {CHANGELOG.map((release) => (
        <ReleaseCard
          key={release.version}
          release={release}
          installed={release.version === appVersion()}
        />
      ))}

      <Pressable
        accessibilityRole="link"
        onPress={() =>
          Linking.openURL(RELEASES_URL).catch(() =>
            Alert.alert('Lien inaccessible', "Aucune application ne peut ouvrir cette adresse."),
          )
        }
        style={({ pressed }) => pressed && styles.pressed}>
        <Text style={styles.link}>Toutes les versions sur GitHub</Text>
      </Pressable>
    </ScrollView>
  );
}

function ReleaseCard({ release, installed }: { release: Release; installed: boolean }) {
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
  content: { padding: theme.spacing(4), gap: theme.spacing(3), paddingBottom: theme.spacing(10) },
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
  link: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: theme.spacing(3),
  },
  pressed: { opacity: 0.75 },
});
