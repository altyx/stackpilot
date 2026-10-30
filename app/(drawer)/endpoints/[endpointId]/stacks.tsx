import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, TextInput, View } from 'react-native';
import { useStrings } from '../../../../src/i18n';
import { useEndpointParam } from '../../../../src/navigation/CurrentEndpoint';
import { useContainers, useStacks } from '../../../../src/api/hooks';
import { ContainerRowSeparator } from '../../../../src/components/ContainerRowSeparator';
import { EmptyState } from '../../../../src/components/EmptyState';
import { ErrorView } from '../../../../src/components/ErrorView';
import { Loader } from '../../../../src/components/Loader';
import { StackCard } from '../../../../src/components/StackCard';
import { groupByStack, mergeStacks } from '../../../../src/lib/stacks';
import { createStyles, useTheme } from '../../../../src/theme';

export default function StacksScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const t = useStrings();
  const id = useEndpointParam();
  const containers = useContainers(id);
  const stacks = useStacks(id);
  const [search, setSearch] = useState('');

  // A token without stack permissions still sees the stacks its containers
  // reveal: Portainer's records are a bonus, not a requirement.
  const overviews = useMemo(
    () => mergeStacks(groupByStack(containers.data ?? []), stacks.data ?? []),
    [containers.data, stacks.data],
  );

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return needle ? overviews.filter((o) => o.name.toLowerCase().includes(needle)) : overviews;
  }, [overviews, search]);

  if (containers.isPending || (stacks.isPending && !stacks.error)) {
    return <Loader label={t.stacks.loading} />;
  }
  if (containers.error) return <ErrorView error={containers.error} onRetry={containers.refetch} />;

  const managed = overviews.filter((o) => o.stack !== null).length;
  const external = overviews.length - managed;

  function refetch() {
    void containers.refetch();
    void stacks.refetch();
  }

  return (
    <FlatList
      data={visible}
      keyExtractor={(overview) => overview.name}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={containers.isRefetching || stacks.isRefetching}
          onRefresh={refetch}
          tintColor={theme.colors.accent}
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t.stacks.filterPlaceholder}
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.search}
          />
          <Text style={styles.summary}>
            {t.stacks.summary(overviews.length, managed, external)}
          </Text>
          {stacks.error ? (
            <Text style={styles.warning}>
              {t.stacks.detailsUnavailable(
                stacks.error instanceof Error ? stacks.error.message : t.stacks.unknownError,
              )}
            </Text>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <EmptyState title={t.stacks.empty} subtitle={search ? t.common.noMatch : undefined} />
      }
      renderItem={({ item }) => <StackCard endpointId={id} overview={item} />}
      ItemSeparatorComponent={ContainerRowSeparator}
    />
  );
}

const useStyles = createStyles((theme) => ({
  list: { padding: theme.spacing(4), paddingBottom: theme.spacing(8) },
  header: { gap: theme.spacing(2), marginBottom: theme.spacing(2) },
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
  warning: { color: theme.colors.warning, fontSize: 12 },
}));
