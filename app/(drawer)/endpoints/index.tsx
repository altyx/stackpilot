import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useEndpoints } from '../../../src/api/hooks';
import type { Endpoint } from '../../../src/api/types';
import { useAuth } from '../../../src/auth/AuthContext';
import { Card, EmptyState, ErrorView, Loader } from '../../../src/components/ui';
import { isKubernetes, isOnline } from '../../../src/lib/endpoints';
import { useCurrentEndpoint } from '../../../src/navigation/CurrentEndpoint';
import { theme } from '../../../src/theme';

export default function EndpointsScreen() {
  const { data, error, isPending, refetch, isRefetching } = useEndpoints();
  const { session } = useAuth();
  const { endpointId } = useCurrentEndpoint();

  if (isPending) return <Loader label="Chargement des environnements…" />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => String(item.Id)}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={theme.colors.accent}
        />
      }
      ListHeaderComponent={
        session ? <Text style={styles.instance}>{session.baseUrl}</Text> : null
      }
      ListEmptyComponent={
        <EmptyState
          title="Aucun environnement"
          subtitle="Ce compte n'a accès à aucun environnement sur cette instance."
        />
      }
      renderItem={({ item }) => <EndpointCard endpoint={item} current={item.Id === endpointId} />}
    />
  );
}

function EndpointCard({ endpoint, current }: { endpoint: Endpoint; current: boolean }) {
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
  list: { padding: theme.spacing(4), gap: theme.spacing(3) },
  instance: { color: theme.colors.textMuted, fontSize: 12, marginBottom: theme.spacing(1) },
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
