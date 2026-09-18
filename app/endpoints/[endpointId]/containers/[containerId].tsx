import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useContainer, useContainerAction, useRecreateContainer } from '../../../../src/api/hooks';
import type { ContainerAction } from '../../../../src/api/types';
import { Button } from '../../../../src/components/Button';
import { Card } from '../../../../src/components/Card';
import { ConfirmSheet } from '../../../../src/components/ConfirmSheet';
import { ContainerImageStatus } from '../../../../src/components/ContainerImageStatus';
import { ContainerLogsSection } from '../../../../src/components/ContainerLogsSection';
import { ErrorView } from '../../../../src/components/ErrorView';
import { Loader } from '../../../../src/components/Loader';
import { Row } from '../../../../src/components/Row';
import { StatusDot } from '../../../../src/components/StatusDot';
import { formatDate, inspectName, shortId, stateLabel } from '../../../../src/lib/format';
import { imageUpdateBlocker } from '../../../../src/lib/recreate';
import { useEndpointParam } from '../../../../src/navigation/CurrentEndpoint';
import { theme } from '../../../../src/theme';

const ACTION_LABELS: Record<ContainerAction, string> = {
  start: 'Démarrer',
  stop: 'Arrêter',
  restart: 'Redémarrer',
  pause: 'Mettre en pause',
  unpause: 'Reprendre',
  kill: 'Tuer',
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

  if (isPending) return <Loader label="Chargement du conteneur…" />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  const running = data.State.Running;
  const name = inspectName(data);
  const updateBlocker = imageUpdateBlocker(data);
  const busy = action.isPending || recreate.isPending;

  function execute(next: ContainerAction) {
    setPendingAction(next);
    action.mutate(next, {
      onError: (e) =>
        Alert.alert(
          'Action échouée',
          e instanceof Error ? e.message : "L'action n'a pas pu être appliquée.",
        ),
      onSettled: () => setPendingAction(null),
    });
  }

  /** Destructive actions go through an explicit confirmation. */
  function run(next: ContainerAction) {
    if (next === 'start') execute(next);
    else setConfirming(next);
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
          Alert.alert('Image mise à jour', `${name} a été recréé avec la dernière image.`);
        },
        onError: (e) =>
          Alert.alert(
            'Mise à jour échouée',
            e instanceof Error ? e.message : "Le conteneur n'a pas pu être recréé.",
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
      <Stack.Screen options={{ title: '' }} />

      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <StatusDot state={data.State.Status} />
          <Text style={styles.state}>{stateLabel(data.State.Status)}</Text>
          {data.State.Health ? (
            <Text style={styles.health}>santé : {data.State.Health.Status}</Text>
          ) : null}
        </View>
        <Text style={styles.image} numberOfLines={2}>
          {data.Config.Image}
        </Text>
        <ContainerImageStatus endpointId={id} containerId={containerId} withLabel />

        <View style={styles.actions}>
          {running ? (
            <>
              <Button
                label={ACTION_LABELS.restart}
                variant="secondary"
                onPress={() => run('restart')}
                loading={pendingAction === 'restart'}
                disabled={busy}
                style={styles.action}
              />
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
              label="Mettre à jour l'image"
              variant="secondary"
              onPress={() => setConfirmingUpdate(true)}
              loading={recreate.isPending}
              disabled={busy}
            />
            {recreate.isPending ? (
              <Text style={styles.updateProgress}>
                Téléchargement de l&apos;image et recréation du conteneur… Cela peut prendre
                plusieurs minutes.
              </Text>
            ) : null}
          </>
        )}
      </Card>

      <Card>
        <Row label="ID" value={shortId(data.Id)} />
        <Row label="Créé le" value={formatDate(data.Created)} />
        <Row label="Démarré le" value={formatDate(data.State.StartedAt)} />
        {!running ? <Row label="Code de sortie" value={String(data.State.ExitCode)} /> : null}
        <Row label="Redémarrage" value={data.HostConfig.RestartPolicy?.Name || 'no'} />
        <Row label="Réseau" value={Object.keys(data.NetworkSettings.Networks).join(', ') || '—'} />
        <Row label="Variables d'env." value={`${data.Config.Env?.length ?? 0}`} />
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

      <ContainerLogsSection endpointId={id} containerId={containerId} />
      <ConfirmSheet
        visible={confirming !== null}
        title={confirming ? `${ACTION_LABELS[confirming]} le conteneur ?` : ''}
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
      <ConfirmSheet
        visible={confirmingUpdate}
        title="Mettre à jour l'image ?"
        message={describeUpdate(name, data.Config.Image)}
        confirmLabel="Mettre à jour"
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
    `Portainer va télécharger la dernière version de ${image}, puis supprimer ${name} ` +
    'et le recréer avec la même configuration. Les données qui ne sont pas conservées ' +
    'dans un volume seront perdues.'
  );
}

function describeImpact(action: ContainerAction | null, name: string): string {
  if (action === 'restart') return `${name} va redémarrer et sera brièvement indisponible.`;
  if (action === 'stop') return `${name} restera arrêté jusqu'à son prochain démarrage.`;
  return '';
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
