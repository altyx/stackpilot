import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useEndpointParam } from '../../../../src/navigation/CurrentEndpoint';
import { useContainers, useNetworks } from '../../../../src/api/hooks';
import { EmptyState } from '../../../../src/components/EmptyState';
import { ErrorView } from '../../../../src/components/ErrorView';
import { Loader } from '../../../../src/components/Loader';
import { NetworkCard } from '../../../../src/components/NetworkCard';
import { matchesNetworkSearch, networksWithUsage } from '../../../../src/lib/networks';
import { createStyles, useTheme } from '../../../../src/theme';

export default function NetworksScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useTranslation();
  const id = useEndpointParam();
  const networks = useNetworks(id);
  const containers = useContainers(id);
  const [search, setSearch] = useState('');

  const usages = useMemo(
    () => networksWithUsage(networks.data ?? [], containers.data ?? []),
    [networks.data, containers.data],
  );
  const visible = useMemo(
    () => usages.filter((usage) => matchesNetworkSearch(usage.item, search)),
    [usages, search],
  );

  if (networks.isPending || containers.isPending) return <Loader label={t('networks.loading')} />;
  const error = networks.error ?? containers.error;
  if (error) {
    return (
      <ErrorView
        error={error}
        onRetry={() => {
          void networks.refetch();
          void containers.refetch();
        }}
      />
    );
  }

  const unused = usages.filter((usage) => usage.usedBy.length === 0).length;

  return (
    <FlatList
      data={visible}
      keyExtractor={(usage) => usage.item.Id}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={networks.isRefetching || containers.isRefetching}
          onRefresh={() => {
            void networks.refetch();
            void containers.refetch();
          }}
          tintColor={theme.colors.accent}
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('networks.filterPlaceholder')}
            accessibilityLabel={t('networks.filterPlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            style={styles.search}
          />
          <Text style={styles.summary}>
            {[
              t('counts.network', { count: usages.length }),
              t('networks.unusedCount', { count: unused }),
            ].join(' · ')}
          </Text>
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          title={t('networks.empty')}
          subtitle={search.trim() ? t('common.noMatch') : undefined}
        />
      }
      renderItem={({ item }) => <NetworkCard usage={item} />}
    />
  );
}

const useStyles = createStyles((theme) => ({
  list: { padding: theme.spacing(4), gap: theme.spacing(3) },
  header: { gap: theme.spacing(2) },
  search: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.borderStrong,
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    color: theme.colors.text,
    fontSize: 15,
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(2.5),
  },
  summary: { color: theme.colors.textMuted, fontSize: 12 },
}));
