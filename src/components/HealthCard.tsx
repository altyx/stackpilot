import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { PROBLEM_LABELS, type ContainerProblem } from '../lib/overview';
import { theme } from '../theme';
import { Card } from './Card';
import { ContainerLinkRow } from './ContainerLinkRow';

/** Beyond this, the list is summarized: the containers screen has the rest. */
const MAX_LISTED = 5;

/** First answer of the overview: does anything need a look? */
export function HealthCard({
  endpointId,
  problems,
}: {
  endpointId: number;
  problems: ContainerProblem[];
}) {
  const ok = problems.length === 0;
  const listed = problems.slice(0, MAX_LISTED);
  const hidden = problems.length - listed.length;
  return (
    <Card style={[styles.card, !ok && styles.cardAlert]}>
      <View style={styles.header}>
        <Ionicons
          name={ok ? 'checkmark-circle' : 'alert-circle'}
          size={24}
          color={ok ? theme.colors.success : theme.colors.warning}
        />
        <View style={styles.headerText}>
          <Text accessibilityRole="header" style={styles.title}>
            {ok
              ? 'Tout fonctionne'
              : `${problems.length} conteneur${problems.length > 1 ? 's' : ''} à surveiller`}
          </Text>
          <Text style={styles.subtitle}>
            {ok
              ? 'Aucun conteneur en mauvaise santé, en boucle ou arrêté anormalement.'
              : 'Touchez un conteneur pour voir ses logs et agir.'}
          </Text>
        </View>
      </View>
      {listed.map(({ container, kind }) => (
        <ContainerLinkRow
          key={container.Id}
          endpointId={endpointId}
          container={container}
          detail={PROBLEM_LABELS[kind]}
          tone="warning"
        />
      ))}
      {hidden > 0 ? (
        <Text style={styles.more}>
          et {hidden} autre{hidden > 1 ? 's' : ''}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing(2) },
  cardAlert: { borderColor: theme.colors.warning },
  header: { flexDirection: 'row', gap: theme.spacing(3), alignItems: 'flex-start' },
  headerText: { flex: 1, gap: theme.spacing(1) },
  title: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  subtitle: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 18 },
  more: { color: theme.colors.textMuted, fontSize: 13 },
});
