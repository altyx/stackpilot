import { FlatList, RefreshControl, Text } from 'react-native';
import { useEndpoints } from '../../../src/api/hooks';
import { useAuth } from '../../../src/auth/AuthContext';
import { EmptyState } from '../../../src/components/EmptyState';
import { EndpointCard } from '../../../src/components/EndpointCard';
import { ErrorView } from '../../../src/components/ErrorView';
import { Loader } from '../../../src/components/Loader';
import { useStrings } from '../../../src/i18n';
import { useCurrentEndpoint } from '../../../src/navigation/CurrentEndpoint';
import { createStyles, useTheme } from '../../../src/theme';

export default function EndpointsScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const t = useStrings();
  const { data, error, isPending, refetch, isRefetching } = useEndpoints();
  const { session } = useAuth();
  const { endpointId } = useCurrentEndpoint();

  if (isPending) return <Loader label={t.endpoints.loading} />;
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
      ListEmptyComponent={<EmptyState title={t.endpoints.empty} subtitle={t.endpoints.emptyHint} />}
      renderItem={({ item }) => <EndpointCard endpoint={item} current={item.Id === endpointId} />}
    />
  );
}

const useStyles = createStyles((theme) => ({
  list: { padding: theme.spacing(4), gap: theme.spacing(3) },
  instance: { color: theme.colors.textMuted, fontSize: 12, marginBottom: theme.spacing(1) },
}));
