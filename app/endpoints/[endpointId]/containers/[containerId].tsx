import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { formatDate, inspectName, shortId, stateLabel } from '../../../../src/lib/format';
import { imageUpdateBlocker } from '../../../../src/lib/recreate';
import { useEndpointParam } from '../../../../src/navigation/CurrentEndpoint';
import { theme } from '../../../../src/theme';

const ACTION_LABELS: Record<ContainerAction, string> = {
  start: 'Start',
  stop: 'Stop',
  restart: 'Restart',
  pause: 'Pause',
  unpause: 'Resume',
  kill: 'Kill',
};

export default function ContainerDetailScreen() {
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

  if (isPending) return <Loader label="Loading container…" />;
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
          'Action failed',
          e instanceof Error ? e.message : 'The action could not be applied.',
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
            'Delete failed',
            e instanceof Error ? e.message : 'The container could not be deleted.',
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
          Alert.alert('Image updated', `${name} was recreated with the latest image.`);
        },
        onError: (e) =>
          Alert.alert(
            'Update failed',
            e instanceof Error ? e.message : 'The container could not be recreated.',
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
                accessibilityLabel="More actions"
                disabled={busy}
                onPress={() => setMenuOpen(true)}
              />
            ) : null,
        }}
      />

      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <StatusDot state={data.State.Status} />
          <Text style={styles.state}>{stateLabel(data.State.Status)}</Text>
          {data.State.Health ? (
            <Text style={styles.health}>health: {data.State.Health.Status}</Text>
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
                  label={ACTION_LABELS.unpause}
                  onPress={() => run('unpause')}
                  loading={pendingAction === 'unpause'}
                  disabled={busy}
                  style={styles.action}
                />
              ) : (
                <Button
                  label={ACTION_LABELS.restart}
                  variant="secondary"
                  onPress={() => run('restart')}
                  loading={pendingAction === 'restart'}
                  disabled={busy}
                  style={styles.action}
                />
              )}
              <Button
                label={ACTION_LABELS.stop}
                variant="danger"
                onPress={() => run('stop')}
                loading={pendingAction === 'stop'}
                disabled={busy}
                style={styles.action}
              />
            </>
          ) : (
            <Button
              label={ACTION_LABELS.start}
              onPress={() => run('start')}
              loading={pendingAction === 'start'}
              disabled={busy}
              style={styles.action}
            />
          )}
        </View>

        {updateBlocker ? (
          <Text style={styles.updateBlocker}>{updateBlocker}</Text>
        ) : (
          <>
            <Button
              label="Update image"
              variant="secondary"
              onPress={() => setConfirmingUpdate(true)}
              loading={recreate.isPending}
              disabled={busy}
            />
            {recreate.isPending ? (
              <Text style={styles.updateProgress}>
                Pulling the image and recreating the container… This can take several minutes.
              </Text>
            ) : null}
          </>
        )}
      </Card>

      <Card>
        <Row label="ID" value={shortId(data.Id)} />
        <Row label="Created" value={formatDate(data.Created)} />
        <Row label="Started" value={formatDate(data.State.StartedAt)} />
        {!running ? <Row label="Exit code" value={String(data.State.ExitCode)} /> : null}
        <Row label="Restart policy" value={data.HostConfig.RestartPolicy?.Name || 'no'} />
        <Row label="Network" value={Object.keys(data.NetworkSettings.Networks).join(', ') || '—'} />
        <Row label="Env. variables" value={`${data.Config.Env?.length ?? 0}`} />
      </Card>

      {data.Mounts.length > 0 ? (
        <Card>
          <Text style={styles.sectionTitle}>Volumes</Text>
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
        title={confirming ? `${ACTION_LABELS[confirming]} container?` : ''}
        message={describeImpact(confirming, name)}
        confirmLabel={confirming ? ACTION_LABELS[confirming] : ''}
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
        title="Delete container?"
        message={describeRemoval(name, running)}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          setConfirmingRemove(false);
          removeContainer();
        }}
        onCancel={() => setConfirmingRemove(false)}>
        {hasVolumeMounts(data) ? (
          <ToggleRow
            label="Also delete its anonymous volumes"
            hint="Named volumes are always kept."
            value={removeVolumes}
            onChange={setRemoveVolumes}
          />
        ) : null}
      </ConfirmSheet>
      <ConfirmSheet
        visible={confirmingUpdate}
        title="Update image?"
        message={describeUpdate(name, data.Config.Image)}
        confirmLabel="Update"
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

function describeUpdate(name: string, image: string): string {
  return (
    `Portainer will pull the latest version of ${image}, then delete ${name} ` +
    'and recreate it with the same configuration. Any data not kept in a volume ' +
    'will be lost.'
  );
}

function describeImpact(action: ContainerAction | null, name: string): string {
  if (action === 'restart') return `${name} will restart and be briefly unavailable.`;
  if (action === 'stop') return `${name} will stay stopped until it is started again.`;
  if (action === 'pause') return `${name} will not respond until it is resumed.`;
  if (action === 'kill') {
    return (
      `${name} will be stopped immediately, with no chance to shut down cleanly: ` +
      'writes in progress may be lost.'
    );
  }
  return '';
}

function describeRemoval(name: string, running: boolean): string {
  return (
    (running ? `${name} will be stopped, then deleted. ` : `${name} will be deleted. `) +
    'Anything not in a volume is lost; it will have to be recreated to run again.'
  );
}

const styles = StyleSheet.create({
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
});
