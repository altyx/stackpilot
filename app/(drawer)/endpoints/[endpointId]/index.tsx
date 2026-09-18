import { useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useEndpointParam } from '../../../../src/navigation/CurrentEndpoint';
import { useContainers, useStackAction } from '../../../../src/api/hooks';
import type { ContainerSummary, StackAction } from '../../../../src/api/types';
import { ContainerRow } from '../../../../src/components/ContainerRow';
import { ContainerRowSeparator } from '../../../../src/components/ContainerRowSeparator';
import { EmptyState } from '../../../../src/components/EmptyState';
import { ErrorView } from '../../../../src/components/ErrorView';
import { Loader } from '../../../../src/components/Loader';
import { Segmented } from '../../../../src/components/Segmented';
import { StackActionSheet } from '../../../../src/components/StackActionSheet';
import { StackHeader } from '../../../../src/components/StackHeader';
import { containerName } from '../../../../src/lib/format';
import {
  countStacks,
  describeStackResult,
  groupByStack,
  type StackSection,
} from '../../../../src/lib/stacks';
import { theme } from '../../../../src/theme';

type Filter = 'all' | 'running' | 'stopped';

export default function ContainersScreen() {
  const id = useEndpointParam();
  const { data, error, isPending, refetch, isRefetching } = useContainers(id);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [pendingStack, setPendingStack] = useState<string | null>(null);
  const [sheetKey, setSheetKey] = useState<string | null>(null);
  const stackAction = useStackAction(id);

  const sections = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const isVisible = (c: ContainerSummary) => {
      const matchesState =
        filter === 'all'
          ? true
          : filter === 'running'
            ? c.State === 'running'
            : c.State !== 'running';
      const matchesSearch = needle
        ? containerName(c).toLowerCase().includes(needle) || c.Image.toLowerCase().includes(needle)
        : true;
      return matchesState && matchesSearch;
    };
    return groupByStack(data ?? [], isVisible);
  }, [data, search, filter]);

  // The sheet tracks the stack by its key, over the unfiltered list: its
  // members stay current across refreshes, and a filter never narrows the scope.
  const sheetSection = useMemo(
    () => (sheetKey ? (groupByStack(data ?? []).find((s) => s.key === sheetKey) ?? null) : null),
    [data, sheetKey],
  );

  function runStackAction(section: StackSection, action: StackAction) {
    setPendingStack(section.key);
    stackAction.mutate(
      { containers: section.members, action },
      {
        onSuccess: (result) => {
          const report = describeStackResult(section, action, result);
          Alert.alert(report.title, report.message);
        },
        onError: (e) =>
          Alert.alert(
            'Action échouée',
            e instanceof Error ? e.message : "L'action n'a pas pu être appliquée.",
          ),
        onSettled: () => setPendingStack(null),
      },
    );
  }

  if (isPending) return <Loader label="Chargement des conteneurs…" />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  const shown = sections.reduce((sum, section) => sum + section.data.length, 0);
  const stackCount = countStacks(sections);

  return (
    <>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.Id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.colors.accent}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Filtrer par nom ou image"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.search}
            />
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'Tous' },
                { value: 'running', label: 'En cours' },
                { value: 'stopped', label: 'Arrêtés' },
              ]}
            />
            <Text style={styles.summary}>
              {shown} conteneur{shown > 1 ? 's' : ''}
              {stackCount > 0 ? ` · ${stackCount} stack${stackCount > 1 ? 's' : ''}` : ''}
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <StackHeader
            section={section}
            busy={pendingStack === (section as StackSection).key}
            disabled={stackAction.isPending}
            onPressActions={(target) => setSheetKey(target.key)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title="Aucun conteneur"
            subtitle={search || filter !== 'all' ? 'Aucun résultat pour ce filtre.' : undefined}
          />
        }
        renderItem={({ item }) => <ContainerRow endpointId={id} container={item} />}
        ItemSeparatorComponent={ContainerRowSeparator}
      />
      <StackActionSheet
        section={sheetSection}
        onConfirm={runStackAction}
        onClose={() => setSheetKey(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: { padding: theme.spacing(4), paddingBottom: theme.spacing(8) },
  header: { gap: theme.spacing(2), marginBottom: theme.spacing(2) },
  search: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    color: theme.colors.text,
    fontSize: 15,
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(2.5),
  },
  summary: { color: theme.colors.textMuted, fontSize: 12 },
});
