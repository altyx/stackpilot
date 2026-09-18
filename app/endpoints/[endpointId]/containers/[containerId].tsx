import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useContainer, useContainerAction } from '../../../../src/api/hooks';
import type { ContainerAction } from '../../../../src/api/types';
import { Button } from '../../../../src/components/Button';
import { Card } from '../../../../src/components/Card';
import { ConfirmSheet } from '../../../../src/components/ConfirmSheet';
import { ContainerLogsSection } from '../../../../src/components/ContainerLogsSection';
import { ErrorView } from '../../../../src/components/ErrorView';
import { Loader } from '../../../../src/components/Loader';
import { Row } from '../../../../src/components/Row';
import { StatusDot } from '../../../../src/components/StatusDot';
import { formatDate, inspectName, shortId, stateLabel } from '../../../../src/lib/format';
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
  // Ouvert par une alerte au démarrage, le conteneur n'a que l'aiguillage
  // d'accueil sous lui : retenir son environnement ramène à ses voisins au retour.
  const id = useEndpointParam();

  const { data, error, isPending, refetch, isRefetching } = useContainer(id, containerId);
  const action = useContainerAction(id, containerId);
  const [pendingAction, setPendingAction] = useState<ContainerAction | null>(null);
  const [confirming, setConfirming] = useState<ContainerAction | null>(null);

  if (isPending) return <Loader label="Chargement du conteneur…" />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  const running = data.State.Running;
  const name = inspectName(data);

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

  /** Les actions destructrices passent par une confirmation explicite. */
  function run(next: ContainerAction) {
    if (next === 'start') execute(next);
    else setConfirming(next);
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.colors.accent} />
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

        <View style={styles.actions}>
          {running ? (
            <>
              <Button
                label={ACTION_LABELS.restart}
                variant="secondary"
                onPress={() => run('restart')}
                loading={pendingAction === 'restart'}
                disabled={action.isPending}
                style={styles.action}
              />
              <Button
                label={ACTION_LABELS.stop}
                variant="danger"
                onPress={() => run('stop')}
                loading={pendingAction === 'stop'}
                disabled={action.isPending}
                style={styles.action}
              />
            </>
          ) : (
            <Button
              label={ACTION_LABELS.start}
              onPress={() => run('start')}
              loading={pendingAction === 'start'}
              disabled={action.isPending}
              style={styles.action}
            />
          )}
        </View>
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
    </ScrollView>
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
  sectionTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
});
