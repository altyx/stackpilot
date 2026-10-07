import { useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import {
  useContainers,
  useRedeployStack,
  useStackAction,
  useStacks,
} from '../../../../src/api/hooks';
import {
  StackStatus,
  type PortainerStack,
  type StackAction,
  type StackEnv,
} from '../../../../src/api/types';
import { Button } from '../../../../src/components/Button';
import { Card } from '../../../../src/components/Card';
import { ConfirmSheet } from '../../../../src/components/ConfirmSheet';
import { ContainerRow } from '../../../../src/components/ContainerRow';
import { ContainerRowSeparator } from '../../../../src/components/ContainerRowSeparator';
import { EmptyState } from '../../../../src/components/EmptyState';
import { ErrorView } from '../../../../src/components/ErrorView';
import { Loader } from '../../../../src/components/Loader';
import { Row } from '../../../../src/components/Row';
import { StackActionSheet } from '../../../../src/components/StackActionSheet';
import { StackEnvEditor } from '../../../../src/components/StackEnvEditor';
import { StackEnvRow } from '../../../../src/components/StackEnvRow';
import { StackFileSection } from '../../../../src/components/StackFileSection';
import { StackKindBadge } from '../../../../src/components/StackKindBadge';
import { StackRedeploySheet } from '../../../../src/components/StackRedeploySheet';
import { useLatched } from '../../../../src/components/useLatched';
import { formatDate } from '../../../../src/lib/format';
import { diffEnv, type EnvDiff } from '../../../../src/lib/stackEnv';
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
  const redeploy = useRedeployStack(id);
  const [redeploying, setRedeploying] = useState(false);
  const [editingEnv, setEditingEnv] = useState(false);
  const [pendingEnv, setPendingEnv] = useState<StackEnv[] | null>(null);
  const shownPendingEnv = useLatched(pendingEnv);

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

  function runRedeploy(target: PortainerStack, pullImages: boolean, env?: StackEnv[]) {
    redeploy.mutate(
      { stack: target, pullImages, env },
      {
        onSuccess: () => {
          setEditingEnv(false);
          Alert.alert('Stack redéployée', `${target.Name} a été redéployée.`);
        },
        // Edits stay in the form on failure: nothing typed is lost.
        onError: (e) =>
          Alert.alert(
            'Redéploiement échoué',
            e instanceof Error ? e.message : "La stack n'a pas pu être redéployée.",
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
      // The variable fields sit low on the page: iOS lifts them over the keyboard.
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
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
        <View style={styles.actions}>
          {section ? (
            <Button
              label="Marche / arrêt"
              variant="secondary"
              onPress={() => setSheetOpen(true)}
              loading={stackAction.isPending}
              disabled={redeploy.isPending}
              style={styles.action}
            />
          ) : null}
          {/* Only Portainer can redeploy: an external stack has no file it knows. */}
          {stack ? (
            <Button
              label="Redéployer"
              onPress={() => setRedeploying(true)}
              loading={redeploy.isPending}
              disabled={stackAction.isPending}
              style={styles.action}
            />
          ) : null}
        </View>
        {redeploy.isPending ? (
          <Text style={styles.note}>
            Redéploiement en cours… Télécharger les images peut prendre plusieurs minutes.
          </Text>
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

      {stack ? (
        <Card style={styles.card}>
          <View style={styles.envHeader}>
            <Text style={styles.sectionTitle}>Variables d&apos;environnement</Text>
            {!editingEnv ? (
              <Text
                accessibilityRole="button"
                onPress={() => setEditingEnv(true)}
                style={styles.link}>
                Modifier
              </Text>
            ) : null}
          </View>
          {editingEnv ? (
            <StackEnvEditor
              initial={stack.Env}
              busy={redeploy.isPending}
              onCancel={() => setEditingEnv(false)}
              onSave={setPendingEnv}
            />
          ) : stack.Env && stack.Env.length > 0 ? (
            stack.Env.map((variable) => <StackEnvRow key={variable.name} variable={variable} />)
          ) : (
            <Text style={styles.note}>Aucune variable définie dans Portainer.</Text>
          )}
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

      <StackRedeploySheet
        stack={redeploying ? stack : null}
        onConfirm={(target, pullImages) => runRedeploy(target, pullImages)}
        onClose={() => setRedeploying(false)}
      />
      <ConfirmSheet
        visible={pendingEnv !== null}
        title="Enregistrer et redéployer ?"
        message={
          stack && shownPendingEnv
            ? describeEnvChange(diffEnv(stack.Env, shownPendingEnv))
            : undefined
        }
        confirmLabel="Enregistrer et redéployer"
        onConfirm={() => {
          const env = pendingEnv;
          setPendingEnv(null);
          if (stack && env) runRedeploy(stack, false, env);
        }}
        onCancel={() => setPendingEnv(null)}
      />
      <StackActionSheet
        section={sheetOpen ? section : null}
        onConfirm={runStackAction}
        onClose={() => setSheetOpen(false)}
      />
    </ScrollView>
  );
}

/** Names, not values: a changed password shouldn't be echoed back on screen. */
function describeEnvChange(diff: EnvDiff): string {
  const parts = [
    diff.added.length ? `Ajoutées : ${diff.added.join(', ')}.` : '',
    diff.changed.length ? `Modifiées : ${diff.changed.join(', ')}.` : '',
    diff.removed.length ? `Retirées : ${diff.removed.join(', ')}.` : '',
  ].filter(Boolean);
  const summary = parts.length ? parts.join(' ') : 'Aucune variable modifiée.';
  return `${summary} La stack sera redéployée pour les appliquer : ses conteneurs concernés seront recréés.`;
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
  actions: { flexDirection: 'row', gap: theme.spacing(2) },
  action: { flex: 1 },
  envHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { color: theme.colors.accent, fontSize: 13, fontWeight: '600' },
});
