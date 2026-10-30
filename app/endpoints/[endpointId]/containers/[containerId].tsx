import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  useContainer,
  useContainerAction,
  useRecreateContainer,
  useRemoveContainer,
} from '../../../../src/api/hooks';
import type { ContainerAction } from '../../../../src/api/types';
import { Button } from '../../../../src/components/Button';
import { Card } from '../../../../src/components/Card';
import { ConfirmSheet } from '../../../../src/components/ConfirmSheet';
import { ContainerActionsSheet } from '../../../../src/components/ContainerActionsSheet';
import { ContainerImageStatus } from '../../../../src/components/ContainerImageStatus';
import { ContainerLogsSection } from '../../../../src/components/ContainerLogsSection';
import { ErrorView } from '../../../../src/components/ErrorView';
import { HeaderMenuButton } from '../../../../src/components/HeaderMenuButton';
import { Loader } from '../../../../src/components/Loader';
import { Row } from '../../../../src/components/Row';
import { StatusDot } from '../../../../src/components/StatusDot';
import { ToggleRow } from '../../../../src/components/ToggleRow';
import {
  hasVolumeMounts,
  secondaryActions,
  type SecondaryAction,
} from '../../../../src/lib/containerActions';
import { useStrings } from '../../../../src/i18n';
import { inspectName, shortId } from '../../../../src/lib/format';
import { imageUpdateBlocker } from '../../../../src/lib/recreate';
import { useEndpointParam } from '../../../../src/navigation/CurrentEndpoint';
import { createStyles, useTheme } from '../../../../src/theme';

export default function ContainerDetailScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const t = useStrings();
  const { containerId } = useLocalSearchParams<{ containerId: string }>();
  // Opened from an alert at launch, the container has only the home redirect
  // under it: remembering its environment returns to its siblings on back.
  const id = useEndpointParam();
  const router = useRouter();

  const { data, error, isPending, refetch, isRefetching } = useContainer(id, containerId);
  const action = useContainerAction(id, containerId);
  const recreate = useRecreateContainer(id, containerId);
  const [pendingAction, setPendingAction] = useState<ContainerAction | null>(null);
  const [confirming, setConfirming] = useState<ContainerAction | null>(null);
  const [confirmingUpdate, setConfirmingUpdate] = useState(false);
  const remove = useRemoveContainer(id, containerId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [removeVolumes, setRemoveVolumes] = useState(false);

  if (isPending) return <Loader label={t.container.loading} />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  const running = data.State.Running;
  const paused = data.State.Paused;
  const extraActions = secondaryActions(data);
  const name = inspectName(data);
  const updateBlocker = imageUpdateBlocker(data);
  const busy = action.isPending || recreate.isPending || remove.isPending;

  function execute(next: ContainerAction) {
    setPendingAction(next);
    action.mutate(next, {
      onError: (e) =>
        Alert.alert(
          t.common.actionFailed,
          e instanceof Error ? e.message : t.common.actionNotApplied,
        ),
      onSettled: () => setPendingAction(null),
    });
  }

  /** Destructive actions go through an explicit confirmation. */
  function run(next: ContainerAction) {
    if (next === 'start' || next === 'unpause') execute(next);
    else setConfirming(next);
  }

  function choose(next: SecondaryAction) {
    if (next === 'remove') {
      setRemoveVolumes(false);
      setConfirmingRemove(true);
    } else {
      run(next);
    }
  }

  /**
   * The screen shows a container that no longer exists once removed: it
   * goes back to the list, or to it directly when opened from an alert.
   */
  function removeContainer() {
    remove.mutate(
      { force: running, removeVolumes },
      {
        onSuccess: () => {
          if (router.canGoBack()) router.back();
          else router.replace(`/endpoints/${id}`);
        },
        onError: (e) =>
          Alert.alert(
            t.common.deleteFailed,
            e instanceof Error ? e.message : t.container.deleteNotApplied,
          ),
      },
    );
  }

  /**
   * Portainer answers with the recreated container, under a new id: this
   * screen's route is swapped for the new one, so going back still lands on
   * the list rather than on a container that no longer exists.
   */
  function updateImage() {
    recreate.mutate(
      { pullImage: true },
      {
        onSuccess: (created) => {
          router.replace(`/endpoints/${id}/containers/${created.Id}`);
          Alert.alert(t.container.imageUpdated, t.container.imageUpdatedMessage(name));
        },
        onError: (e) =>
          Alert.alert(
            t.container.updateFailed,
            e instanceof Error ? e.message : t.container.recreateNotApplied,
          ),
      },
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={theme.colors.accent}
        />
      }>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () =>
            extraActions.length > 0 ? (
              <HeaderMenuButton
                accessibilityLabel={t.container.moreActions}
                disabled={busy}
                onPress={() => setMenuOpen(true)}
              />
            ) : null,
        }}
      />

      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <StatusDot state={data.State.Status} />
          <Text style={styles.state}>{t.containerState(data.State.Status)}</Text>
          {data.State.Health ? (
            <Text style={styles.health}>{t.container.health(data.State.Health.Status)}</Text>
          ) : null}
        </View>
        <Text style={styles.image} numberOfLines={2}>
          {data.Config.Image}
        </Text>
        <ContainerImageStatus endpointId={id} containerId={containerId} withLabel />

        <View style={styles.actions}>
          {running ? (
            <>
              {/* A paused container waits to be resumed, not restarted. */}
              {paused ? (
                <Button
                  label={t.container.actions.unpause}
                  onPress={() => run('unpause')}
                  loading={pendingAction === 'unpause'}
                  disabled={busy}
                  style={styles.action}
                />
              ) : (
                <Button
                  label={t.container.actions.restart}
                  variant="secondary"
                  onPress={() => run('restart')}
                  loading={pendingAction === 'restart'}
                  disabled={busy}
                  style={styles.action}
                />
              )}
              <Button
                label={t.container.actions.stop}
                variant="danger"
                onPress={() => run('stop')}
                loading={pendingAction === 'stop'}
                disabled={busy}
                style={styles.action}
              />
            </>
          ) : (
            <Button
              label={t.container.actions.start}
              onPress={() => run('start')}
              loading={pendingAction === 'start'}
              disabled={busy}
              style={styles.action}
            />
          )}
        </View>

        {updateBlocker ? (
          <Text style={styles.updateBlocker}>{t.container.blockers[updateBlocker]}</Text>
        ) : (
          <>
            <Button
              label={t.container.updateImage}
              variant="secondary"
              onPress={() => setConfirmingUpdate(true)}
              loading={recreate.isPending}
              disabled={busy}
            />
            {recreate.isPending ? (
              <Text style={styles.updateProgress}>{t.container.pulling}</Text>
            ) : null}
          </>
        )}
      </Card>

      <Card>
        <Row label={t.container.id} value={shortId(data.Id)} />
        <Row label={t.container.created} value={t.date(data.Created)} />
        <Row label={t.container.started} value={t.date(data.State.StartedAt)} />
        {!running ? <Row label={t.container.exitCode} value={String(data.State.ExitCode)} /> : null}
        <Row
          label={t.container.restartPolicy}
          value={data.HostConfig.RestartPolicy?.Name || 'no'}
        />
        <Row
          label={t.container.network}
          value={Object.keys(data.NetworkSettings.Networks).join(', ') || '—'}
        />
        <Row label={t.container.envVariables} value={`${data.Config.Env?.length ?? 0}`} />
      </Card>

      {data.Mounts.length > 0 ? (
        <Card>
          <Text style={styles.sectionTitle}>{t.container.volumes}</Text>
          {data.Mounts.map((mount) => (
            <Row
              key={`${mount.Source}:${mount.Destination}`}
              label={mount.Destination}
              value={`${mount.Type}${mount.RW ? '' : ' (ro)'}`}
            />
          ))}
        </Card>
      ) : null}

      <ContainerLogsSection endpointId={id} containerId={containerId} containerName={name} />
      <ConfirmSheet
        visible={confirming !== null}
        title={confirming ? t.container.confirmTitle(confirming) : ''}
        message={confirming ? t.container.impact(confirming, name) : ''}
        confirmLabel={confirming ? t.container.actions[confirming] : ''}
        destructive
        onConfirm={() => {
          const next = confirming;
          setConfirming(null);
          if (next) execute(next);
        }}
        onCancel={() => setConfirming(null)}
      />
      <ContainerActionsSheet
        visible={menuOpen}
        name={name}
        actions={extraActions}
        onChoose={choose}
        onClose={() => setMenuOpen(false)}
      />
      <ConfirmSheet
        visible={confirmingRemove}
        title={t.container.deleteTitle}
        message={t.container.removal(name, running)}
        confirmLabel={t.common.delete}
        destructive
        onConfirm={() => {
          setConfirmingRemove(false);
          removeContainer();
        }}
        onCancel={() => setConfirmingRemove(false)}>
        {hasVolumeMounts(data) ? (
          <ToggleRow
            label={t.container.alsoVolumes}
            hint={t.container.namedVolumesKept}
            value={removeVolumes}
            onChange={setRemoveVolumes}
          />
        ) : null}
      </ConfirmSheet>
      <ConfirmSheet
        visible={confirmingUpdate}
        title={t.container.updateTitle}
        message={t.container.updateMessage(name, data.Config.Image)}
        confirmLabel={t.container.update}
        destructive
        onConfirm={() => {
          setConfirmingUpdate(false);
          updateImage();
        }}
        onCancel={() => setConfirmingUpdate(false)}
      />
    </ScrollView>
  );
}

const useStyles = createStyles((theme) => ({
  content: { padding: theme.spacing(4), gap: theme.spacing(3), paddingBottom: theme.spacing(10) },
  card: { gap: theme.spacing(3) },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2) },
  state: { color: theme.colors.text, fontSize: 16, fontWeight: '600' },
  health: { color: theme.colors.textMuted, fontSize: 12 },
  image: { color: theme.colors.textMuted, fontSize: 13 },
  actions: { flexDirection: 'row', gap: theme.spacing(2) },
  action: { flex: 1 },
  updateBlocker: { color: theme.colors.textMuted, fontSize: 12 },
  updateProgress: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17 },
  sectionTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
}));
