import { useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useContainers, useStackAction, useStacks } from '../../../../src/api/hooks';
import { StackStatus, type StackAction } from '../../../../src/api/types';
import { Button } from '../../../../src/components/Button';
import { Card } from '../../../../src/components/Card';
import { ContainerRow } from '../../../../src/components/ContainerRow';
import { ContainerRowSeparator } from '../../../../src/components/ContainerRowSeparator';
import { EmptyState } from '../../../../src/components/EmptyState';
import { ErrorView } from '../../../../src/components/ErrorView';
import { Loader } from '../../../../src/components/Loader';
import { Row } from '../../../../src/components/Row';
import { StackActionSheet } from '../../../../src/components/StackActionSheet';
import { StackEnvRow } from '../../../../src/components/StackEnvRow';
import { StackFileSection } from '../../../../src/components/StackFileSection';
import { StackKindBadge } from '../../../../src/components/StackKindBadge';
import { formatDate } from '../../../../src/lib/format';
import {
  STACK_KIND_LABELS,
  describeStackResult,
  groupByStack,
  mergeStacks,
  type StackSection,
} from '../../../../src/lib/stacks';
import { useEndpointParam } from '../../../../src/navigation/CurrentEndpoint';
import { theme } from '../../../../src/theme';

export default function StackDetailScreen() {
  const { stackName } = useLocalSearchParams<{ stackName: string }>();
  const id = useEndpointParam();
  const containers = useContainers(id);
  const stacks = useStacks(id);
  const stackAction = useStackAction(id);
  const [sheetOpen, setSheetOpen] = useState(false);

  const overview = useMemo(
    () =>
      mergeStacks(groupByStack(containers.data ?? []), stacks.data ?? []).find(
        (candidate) => candidate.name === stackName,
      ) ?? null,
    [containers.data, stacks.data, stackName],
  );

  if (containers.isPending || (stacks.isPending && !stacks.error)) {
    return <Loader label="Chargement de la stack…" />;
  }
  if (containers.error) return <ErrorView error={containers.error} onRetry={containers.refetch} />;
  if (!overview) {
    return (
      <>
        <Stack.Screen options={{ title: stackName }} />
        <EmptyState
          title="Stack introuvable"
          subtitle="Elle a peut-être été supprimée, ou ses conteneurs ont disparu."
        />
      </>
    );
  }

  const { stack, section, running, total } = overview;

  function runStackAction(target: StackSection, action: StackAction) {
    stackAction.mutate(
      { containers: target.members, action },
      {
        onSuccess: (result) => {
          const report = describeStackResult(target, action, result);
          Alert.alert(report.title, report.message);
        },
        onError: (e) =>
          Alert.alert(
            'Action échouée',
            e instanceof Error ? e.message : "L'action n'a pas pu être appliquée.",
          ),
      },
    );
  }

  function refetch() {
    void containers.refetch();
    void stacks.refetch();
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={containers.isRefetching || stacks.isRefetching}
          onRefresh={refetch}
          tintColor={theme.colors.accent}
        />
      }>
      <Stack.Screen options={{ title: overview.name }} />

      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.count}>
            {total === 0 ? 'Aucun conteneur' : `${running}/${total} en cours`}
          </Text>
          <StackKindBadge kind={overview.kind} />
        </View>
        {stack ? null : (
          <Text style={styles.note}>
            Stack déployée hors de Portainer : seuls ses conteneurs sont connus.
          </Text>
        )}
        {section ? (
          <Button
            label="Démarrer ou arrêter la stack"
            variant="secondary"
            onPress={() => setSheetOpen(true)}
            loading={stackAction.isPending}
          />
        ) : null}
      </Card>

      {stack ? (
        <Card>
          <Row label="Type" value={STACK_KIND_LABELS[overview.kind]} />
          <Row
            label="État Portainer"
            value={stack.Status === StackStatus.Active ? 'Active' : 'Inactive'}
          />
          <Row label="Créée le" value={stack.CreationDate ? formatDate(stack.CreationDate) : '—'} />
          <Row label="Par" value={stack.CreatedBy || '—'} />
          {stack.UpdateDate ? (
            <>
              <Row label="Mise à jour le" value={formatDate(stack.UpdateDate)} />
              <Row label="Par" value={stack.UpdatedBy || '—'} />
            </>
          ) : null}
          <Row label="Fichier" value={stack.EntryPoint || '—'} />
          {stack.GitConfig ? (
            <>
              <Row label="Dépôt Git" value={stack.GitConfig.URL} />
              <Row label="Référence" value={stack.GitConfig.ReferenceName} />
              <Row
                label="Mise à jour auto"
                value={describeAutoUpdate(stack.AutoUpdate?.Interval, stack.AutoUpdate?.Webhook)}
              />
            </>
          ) : null}
          {stack.Webhook ? <Row label="Webhook" value="Oui" /> : null}
        </Card>
      ) : null}

      {stack?.Env && stack.Env.length > 0 ? (
        <Card>
          <Text style={styles.sectionTitle}>Variables d&apos;environnement</Text>
          {stack.Env.map((variable) => (
            <StackEnvRow key={variable.name} variable={variable} />
          ))}
        </Card>
      ) : null}

      {section ? (
        <View style={styles.members}>
          <Text style={styles.sectionTitle}>Conteneurs</Text>
          {section.members.map((container, index) => (
            <View key={container.Id}>
              {index > 0 ? <ContainerRowSeparator /> : null}
              <ContainerRow endpointId={id} container={container} />
            </View>
          ))}
        </View>
      ) : null}

      {stack ? <StackFileSection stackId={stack.Id} /> : null}

      <StackActionSheet
        section={sheetOpen ? section : null}
        onConfirm={runStackAction}
        onClose={() => setSheetOpen(false)}
      />
    </ScrollView>
  );
}

function describeAutoUpdate(interval?: string, webhook?: string): string {
  if (interval) return `Toutes les ${interval}`;
  if (webhook) return 'Par webhook';
  return 'Non';
}

const styles = StyleSheet.create({
  content: { padding: theme.spacing(4), gap: theme.spacing(3), paddingBottom: theme.spacing(10) },
  card: { gap: theme.spacing(3) },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2) },
  count: { color: theme.colors.text, fontSize: 16, fontWeight: '600', flex: 1 },
  note: { color: theme.colors.textMuted, fontSize: 12 },
  sectionTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  members: { gap: theme.spacing(2) },
});
