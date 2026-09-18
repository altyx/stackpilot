import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import type { Endpoint } from '../api/types';
import { isKubernetes, isOnline } from '../lib/endpoints';
import { theme } from '../theme';
import { Card } from './Card';

export function EndpointCard({ endpoint, current }: { endpoint: Endpoint; current: boolean }) {
  const snapshot = endpoint.Snapshots?.[0];
  const kubernetes = isKubernetes(endpoint);
  const online = isOnline(endpoint);

  const card = (
    <Card style={[styles.card, current && styles.cardCurrent]}>
      <View style={styles.cardHeader}>
        <Text style={styles.name} numberOfLines={1}>
          {endpoint.Name}
        </Text>
        <Text style={[styles.badge, online ? styles.badgeUp : styles.badgeDown]}>
          {online ? 'En ligne' : 'Hors ligne'}
        </Text>
      </View>
      <Text style={styles.url} numberOfLines={1}>
        {endpoint.URL || 'socket local'}
      </Text>
      {kubernetes ? (
        <Text style={styles.unsupported}>
          Environnement Kubernetes — non pris en charge par l&apos;application.
        </Text>
      ) : (
        <Text style={styles.stats}>
          {snapshot
            ? `${snapshot.RunningContainerCount ?? 0} en cours · ${snapshot.StoppedContainerCount ?? 0} arrêtés · ${snapshot.ImageCount ?? 0} images`
            : 'Aucun instantané disponible'}
        </Text>
      )}
    </Card>
  );

  if (kubernetes || !online) return <View style={styles.disabled}>{card}</View>;

  return (
    <Link href={`/endpoints/${endpoint.Id}`} asChild>
      <Pressable style={({ pressed }) => pressed && styles.pressed}>{card}</Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing(1.5) },
  // Repère l'environnement que visent les entrées du menu.
  cardCurrent: { borderColor: theme.colors.accent },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2) },
  name: { color: theme.colors.text, fontSize: 16, fontWeight: '600', flex: 1 },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
  },
  badgeUp: { backgroundColor: theme.colors.accentDim, color: theme.colors.text },
  badgeDown: { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.textMuted },
  url: { color: theme.colors.textMuted, fontSize: 12 },
  stats: { color: theme.colors.text, fontSize: 13 },
  unsupported: { color: theme.colors.warning, fontSize: 12 },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.75 },
});
