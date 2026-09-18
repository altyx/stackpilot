import { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStackFile } from '../api/hooks';
import { maskSensitiveLines } from '../lib/secrets';
import { theme } from '../theme';
import { Button } from './Button';
import { Card } from './Card';

/**
 * Compose file of a Portainer stack, loaded on demand: it can be long.
 * Credential-looking values are hidden until revealed, as in the variables
 * list: the file usually repeats them.
 */
export function StackFileSection({ stackId }: { stackId: number }) {
  const [visible, setVisible] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const file = useStackFile(visible ? stackId : null);
  const content = useMemo(() => maskSensitiveLines(file.data?.trim() ?? ''), [file.data]);

  function close() {
    setVisible(false);
    setRevealed(false);
  }

  if (!visible) {
    return (
      <Button
        label="Afficher le fichier Compose"
        variant="secondary"
        onPress={() => setVisible(true)}
      />
    );
  }

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Fichier Compose</Text>
        <View style={styles.headerActions}>
          {content.masked > 0 ? (
            <Text
              accessibilityRole="button"
              onPress={() => setRevealed((current) => !current)}
              style={styles.link}>
              {revealed ? 'Masquer les secrets' : `Révéler les secrets (${content.masked})`}
            </Text>
          ) : null}
          <Text accessibilityRole="button" onPress={close} style={styles.link}>
            Fermer
          </Text>
        </View>
      </View>
      {file.isPending ? (
        <Text style={styles.muted}>Chargement…</Text>
      ) : file.error ? (
        <Text style={styles.error}>
          {file.error instanceof Error ? file.error.message : 'Fichier indisponible.'}
        </Text>
      ) : (
        // Horizontal only: the page scrolls vertically, so the whole file is
        // reachable. A bounded box here would clip it with no way to scroll.
        <ScrollView horizontal style={styles.box} contentContainerStyle={styles.boxContent}>
          <Text selectable={revealed || content.masked === 0} style={styles.code}>
            {(revealed ? file.data.trim() : content.text) || 'Fichier vide.'}
          </Text>
        </ScrollView>
      )}
      <Button label="Masquer le fichier Compose" variant="secondary" onPress={close} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing(3) },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing(3),
  },
  headerActions: { flexDirection: 'row', gap: theme.spacing(4) },
  sectionTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  link: { color: theme.colors.accent, fontSize: 13, fontWeight: '600' },
  box: { backgroundColor: theme.colors.bg, borderRadius: theme.radius.sm },
  // Padding on the content, not the viewport: it then scrolls with the text
  // and the last column keeps its margin.
  boxContent: { padding: theme.spacing(3) },
  code: {
    color: theme.colors.text,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: 11,
    lineHeight: 16,
  },
  muted: { color: theme.colors.textMuted, fontSize: 13 },
  error: { color: theme.colors.danger, fontSize: 13 },
});
