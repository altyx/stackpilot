import { FlatList, RefreshControl, StyleSheet, Text } from 'react-native';
import { useEndpoints } from '../../../src/api/hooks';
import { useAuth } from '../../../src/auth/AuthContext';
import { EmptyState } from '../../../src/components/EmptyState';
import { EndpointCard } from '../../../src/components/EndpointCard';
import { ErrorView } from '../../../src/components/ErrorView';
import { Loader } from '../../../src/components/Loader';
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
      ListHeaderComponent={session ? <Text style={styles.instance}>{session.baseUrl}</Text> : null}
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

const styles = StyleSheet.create({
  list: { padding: theme.spacing(4), gap: theme.spacing(3) },
  instance: { color: theme.colors.textMuted, fontSize: 12, marginBottom: theme.spacing(1) },
});
