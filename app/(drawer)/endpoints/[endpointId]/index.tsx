import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { useEndpointParam } from '../../../../src/navigation/CurrentEndpoint';
import { useContainers, useStackAction, type StackActionResult } from '../../../../src/api/hooks';
import type { ContainerSummary, StackAction } from '../../../../src/api/types';
import { StackActionSheet } from '../../../../src/components/StackActionSheet';
import {
  Card,
  EmptyState,
  ErrorView,
  Loader,
  Segmented,
  StatusDot,
} from '../../../../src/components/ui';
import { containerName } from '../../../../src/lib/format';
import { countStacks, groupByStack, type StackSection } from '../../../../src/lib/stacks';
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
        filter === 'all' ? true : filter === 'running' ? c.State === 'running' : c.State !== 'running';
      const matchesSearch = needle
        ? containerName(c).toLowerCase().includes(needle) || c.Image.toLowerCase().includes(needle)
        : true;
      return matchesState && matchesSearch;
    };
    return groupByStack(data ?? [], isVisible);
  }, [data, search, filter]);

  // La feuille suit la stack par sa clé, sur la liste non filtrée : ses membres
  // restent à jour au fil des rafraîchissements, et un filtre n'en réduit pas la portée.
  const sheetSection = useMemo(
    () => (sheetKey ? (groupByStack(data ?? []).find((s) => s.key === sheetKey) ?? null) : null),
    [data, sheetKey],
  );

  function runStackAction(section: StackSection, action: StackAction) {
    setPendingStack(section.key);
    stackAction.mutate(
      { containers: section.members, action },
      {
        onSuccess: (result) => reportStackResult(section, action, result),
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
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.colors.accent} />
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
            section={section as StackSection}
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
        ItemSeparatorComponent={RowSeparator}
      />
      <StackActionSheet
        section={sheetSection}
        onConfirm={runStackAction}
        onClose={() => setSheetKey(null)}
      />
    </>
  );
}

function reportStackResult(
  section: StackSection,
  action: StackAction,
  result: StackActionResult,
): void {
  const verb = action === 'start' ? 'démarrés' : 'arrêtés';
  if (result.failures.length === 0) {
    Alert.alert(section.title, `${result.succeeded} conteneurs ${verb}.`);
    return;
  }
  const detail = result.failures.map((f) => `• ${f.name} : ${f.message}`).join('\n');
  Alert.alert(
    section.title,
    `${result.succeeded} conteneurs ${verb}, ${result.failures.length} en échec.\n\n${detail}`,
  );
}

function StackHeader({
  section,
  busy,
  disabled,
  onPressActions,
}: {
  section: StackSection;
  busy: boolean;
  disabled: boolean;
  onPressActions: (section: StackSection) => void;
}) {
  const { title, members, running } = section;
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle} numberOfLines={1}>
        {title}
      </Text>
      <Text style={[styles.sectionCount, running === members.length && styles.sectionCountFull]}>
        {running}/{members.length} en cours
      </Text>
      {section.ungrouped ? null : busy ? (
        <ActivityIndicator color={theme.colors.accent} size="small" style={styles.sectionAction} />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Actions sur la stack ${title}`}
          accessibilityState={{ disabled }}
          disabled={disabled}
          hitSlop={12}
          onPress={() => onPressActions(section)}
          style={({ pressed }) => [styles.sectionAction, (pressed || disabled) && styles.pressed]}>
          <Ionicons name="ellipsis-horizontal" size={18} color={theme.colors.accent} />
        </Pressable>
      )}
    </View>
  );
}

/**
 * L'espace entre cartes vient d'un séparateur et non d'une marge sur la carte :
 * `Link asChild` fusionne le style de son enfant par étalement d'objet, et un
 * style fonction de `Pressable` y est perdu, marge comprise.
 */
function RowSeparator() {
  return <View style={styles.rowSeparator} />;
}

function ContainerRow({ endpointId, container }: { endpointId: number; container: ContainerSummary }) {
  return (
    <Link href={`/endpoints/${endpointId}/containers/${container.Id}`} asChild>
      <Pressable style={({ pressed }) => pressed && styles.pressed}>
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <StatusDot state={container.State} />
            <Text style={styles.name} numberOfLines={1}>
              {containerName(container)}
            </Text>
          </View>
          <Text style={styles.image} numberOfLines={1}>
            {container.Image}
          </Text>
          <Text style={styles.status} numberOfLines={1}>
            {container.Status}
          </Text>
        </Card>
      </Pressable>
    </Link>
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
  // Fond opaque obligatoire : l'en-tête reste collé au-dessus des cartes.
  sectionHeader: {
    backgroundColor: theme.colors.bg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(3),
    paddingTop: theme.spacing(3),
    paddingBottom: theme.spacing(2),
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  sectionCount: { color: theme.colors.textMuted, fontSize: 12, marginLeft: 'auto' },
  sectionCountFull: { color: theme.colors.success },
  sectionAction: { width: 28, alignItems: 'flex-end' },
  rowSeparator: { height: theme.spacing(2) },
  card: { gap: theme.spacing(1) },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2) },
  name: { color: theme.colors.text, fontSize: 15, fontWeight: '600', flex: 1 },
  image: { color: theme.colors.textMuted, fontSize: 12 },
  status: { color: theme.colors.textMuted, fontSize: 12 },
  pressed: { opacity: 0.75 },
});
