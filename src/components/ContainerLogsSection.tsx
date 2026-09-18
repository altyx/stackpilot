import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useContainerLogs } from '../api/hooks';
import { theme } from '../theme';
import { Button } from './Button';
import { Card } from './Card';

export function ContainerLogsSection({
  endpointId,
  containerId,
}: {
  endpointId: number;
  containerId: string;
}) {
  const [visible, setVisible] = useState(false);
  const logs = useContainerLogs(endpointId, containerId);

  if (!visible) {
    return (
      <Button
        label="Afficher les logs"
        variant="secondary"
        onPress={() => {
          setVisible(true);
          void logs.refetch();
        }}
      />
    );
  }

  return (
    <Card style={styles.card}>
      <View style={styles.logsHeader}>
        <Text style={styles.sectionTitle}>200 dernières lignes</Text>
        <Text accessibilityRole="button" onPress={() => logs.refetch()} style={styles.refresh}>
          Rafraîchir
        </Text>
      </View>
      {logs.isFetching ? (
        <Text style={styles.logsMuted}>Chargement…</Text>
      ) : logs.error ? (
        <Text style={styles.logsError}>
          {logs.error instanceof Error ? logs.error.message : 'Logs indisponibles.'}
        </Text>
      ) : (
        // Horizontal only: the page scrolls vertically, so every line is
        // reachable. A bounded box here would clip them with no way to scroll.
        <ScrollView horizontal style={styles.logsBox} contentContainerStyle={styles.logsContent}>
          <Text selectable style={styles.logsText}>
            {logs.data?.trim() || 'Aucune sortie.'}
          </Text>
        </ScrollView>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing(3) },
  sectionTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  logsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refresh: { color: theme.colors.accent, fontSize: 13, fontWeight: '600' },
  logsBox: { backgroundColor: theme.colors.bg, borderRadius: theme.radius.sm },
  logsContent: { padding: theme.spacing(3) },
  logsText: {
    color: theme.colors.text,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: 11,
    lineHeight: 16,
  },
  logsMuted: { color: theme.colors.textMuted, fontSize: 13 },
  logsError: { color: theme.colors.danger, fontSize: 13 },
});
