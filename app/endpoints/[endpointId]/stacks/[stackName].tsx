import { useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Text, View } from 'react-native';
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
import { StackImageStatus } from '../../../../src/components/StackImageStatus';
import { StackKindBadge } from '../../../../src/components/StackKindBadge';
import { StackRedeploySheet } from '../../../../src/components/StackRedeploySheet';
import { useLatched } from '../../../../src/components/useLatched';
import { useStrings, type Strings } from '../../../../src/i18n';
import { diffEnv } from '../../../../src/lib/stackEnv';
import {
  describeStackResult,
  groupByStack,
  mergeStacks,
  type StackSection,
} from '../../../../src/lib/stacks';
import { useEndpointParam } from '../../../../src/navigation/CurrentEndpoint';
import { createStyles, useTheme } from '../../../../src/theme';

export default function StackDetailScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const t = useStrings();
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
    return <Loader label={t.stack.loading} />;
  }
  if (containers.error) return <ErrorView error={containers.error} onRetry={containers.refetch} />;
  if (!overview) {
    return (
      <>
        <Stack.Screen options={{ title: stackName }} />
        <EmptyState title={t.stack.notFound} subtitle={t.stack.notFoundHint} />
      </>
    );
  }

  const { stack, section, running, total } = overview;

  function runStackAction(target: StackSection, action: StackAction) {
    stackAction.mutate(
      { containers: target.members, action },
      {
        onSuccess: (result) => {
          const report = describeStackResult(target, action, result, t);
          Alert.alert(report.title, report.message);
        },
        onError: (e) =>
          Alert.alert(
            t.common.actionFailed,
            e instanceof Error ? e.message : t.common.actionNotApplied,
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
          Alert.alert(t.stack.redeployed, t.stack.redeployedMessage(target.Name));
        },
        // Edits stay in the form on failure: nothing typed is lost.
        onError: (e) =>
          Alert.alert(
            t.stack.redeployFailed,
            e instanceof Error ? e.message : t.stack.redeployNotApplied,
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
            {total === 0 ? t.common.noContainers : t.common.runningRatio(running, total)}
          </Text>
          <StackKindBadge kind={overview.kind} />
        </View>
        {stack ? <StackImageStatus endpointId={id} stackId={stack.Id} withLabel /> : null}
        {stack ? null : <Text style={styles.note}>{t.stack.externalNote}</Text>}
        <View style={styles.actions}>
          {section ? (
            <Button
              label={t.stack.startStop}
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
              label={t.stack.redeploy}
              onPress={() => setRedeploying(true)}
              loading={redeploy.isPending}
              disabled={stackAction.isPending}
              style={styles.action}
            />
          ) : null}
        </View>
        {redeploy.isPending ? <Text style={styles.note}>{t.stack.redeploying}</Text> : null}
      </Card>

      {stack ? (
        <Card>
          <Row label={t.stack.type} value={t.stacks.kinds[overview.kind]} />
          <Row
            label={t.stack.portainerStatus}
            value={stack.Status === StackStatus.Active ? t.stack.active : t.stack.inactive}
          />
          <Row
            label={t.stack.created}
            value={stack.CreationDate ? t.date(stack.CreationDate) : '—'}
          />
          <Row label={t.stack.by} value={stack.CreatedBy || '—'} />
          {stack.UpdateDate ? (
            <>
              <Row label={t.stack.updated} value={t.date(stack.UpdateDate)} />
              <Row label={t.stack.by} value={stack.UpdatedBy || '—'} />
            </>
          ) : null}
          <Row label={t.stack.file} value={stack.EntryPoint || '—'} />
          {stack.GitConfig ? (
            <>
              <Row label={t.stack.gitRepository} value={stack.GitConfig.URL} />
              <Row label={t.stack.reference} value={stack.GitConfig.ReferenceName} />
              <Row
                label={t.stack.autoUpdate}
                value={describeAutoUpdate(t, stack.AutoUpdate?.Interval, stack.AutoUpdate?.Webhook)}
              />
            </>
          ) : null}
          {stack.Webhook ? <Row label={t.stack.webhook} value={t.stack.yes} /> : null}
        </Card>
      ) : null}

      {stack ? (
        <Card style={styles.card}>
          <View style={styles.envHeader}>
            <Text style={styles.sectionTitle}>{t.stack.envTitle}</Text>
            {!editingEnv ? (
              <Text
                accessibilityRole="button"
                onPress={() => setEditingEnv(true)}
                style={styles.link}>
                {t.common.edit}
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
            <Text style={styles.note}>{t.stack.noVariables}</Text>
          )}
        </Card>
      ) : null}

      {section ? (
        <View style={styles.members}>
          <Text style={styles.sectionTitle}>{t.stack.containers}</Text>
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
        title={t.stack.saveTitle}
        message={
          stack && shownPendingEnv
            ? t.stack.envChange(diffEnv(stack.Env, shownPendingEnv))
            : undefined
        }
        confirmLabel={t.stack.saveConfirm}
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

function describeAutoUpdate(t: Strings, interval?: string, webhook?: string): string {
  if (interval) return t.stack.autoUpdateEvery(interval);
  if (webhook) return t.stack.autoUpdateByWebhook;
  return t.stack.no;
}

const useStyles = createStyles((theme) => ({
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
}));
