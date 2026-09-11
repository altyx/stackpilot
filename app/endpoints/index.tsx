import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, Stack, useRouter } from 'expo-router';
import { useEndpoints } from '../../src/api/hooks';
import { EndpointType, type Endpoint } from '../../src/api/types';
import { useAuth } from '../../src/auth/AuthContext';
import { BuildInfo } from '../../src/components/BuildInfo';
import { Card, EmptyState, ErrorView, Loader } from '../../src/components/ui';
import { theme } from '../../src/theme';

const KUBERNETES_TYPES = new Set([
  EndpointType.KubernetesLocal,
  EndpointType.KubernetesAgent,
  EndpointType.KubernetesEdgeAgent,
]);

export default function EndpointsScreen() {
  const { data, error, isPending, refetch, isRefetching } = useEndpoints();
  const { signOut, session } = useAuth();
  const router = useRouter();

  if (isPending) return <Loader label="Chargement des environnements…" />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Notifications"
                hitSlop={12}
                onPress={() => router.push('/notifications')}
                style={({ pressed }) => pressed && styles.pressed}>
                <Ionicons
                  name="notifications-outline"
                  size={22}
                  color={theme.colors.accent}
                />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => {
                  void signOut().then(() => router.replace('/login'));
                }}
                style={({ pressed }) => pressed && styles.pressed}>
                <Text style={styles.headerAction}>Déconnexion</Text>
              </Pressable>
            </View>
          ),
        }}
      />
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
        renderItem={({ item }) => <EndpointCard endpoint={item} />}
        ListFooterComponent={<BuildInfo />}
      />
    </>
  );
}

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const snapshot = endpoint.Snapshots?.[0];
  const isKubernetes = KUBERNETES_TYPES.has(endpoint.Type);
  const online = endpoint.Status === 1;

  const card = (
    <Card style={styles.card}>
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
      {isKubernetes ? (
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

  if (isKubernetes || !online) return <View style={styles.disabled}>{card}</View>;

  return (
    <Link href={`/endpoints/${endpoint.Id}`} asChild>
      <Pressable style={({ pressed }) => pressed && styles.pressed}>{card}</Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  list: { padding: theme.spacing(4), gap: theme.spacing(3) },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(6) },
  headerAction: { color: theme.colors.accent, fontSize: 14, fontWeight: '600' },
  instance: { color: theme.colors.textMuted, fontSize: 12, marginBottom: theme.spacing(1) },
  card: { gap: theme.spacing(1.5) },
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
