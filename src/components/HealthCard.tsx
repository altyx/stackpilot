import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ContainerProblem } from '../lib/overview';
import { createStyles, useTheme } from '../theme';
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
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useTranslation();
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
            {ok ? t('overview.allGood') : t('overview.toCheck', { count: problems.length })}
          </Text>
          <Text style={styles.subtitle}>
            {ok ? t('overview.allGoodHint') : t('overview.toCheckHint')}
          </Text>
        </View>
      </View>
      {listed.map(({ container, kind }) => (
        <ContainerLinkRow
          key={container.Id}
          endpointId={endpointId}
          container={container}
          detail={t(`overview.problems.${kind}`)}
          tone="warning"
        />
      ))}
      {hidden > 0 ? (
        <Text style={styles.more}>{t('common.andMore', { count: hidden })}</Text>
      ) : null}
    </Card>
  );
}

const useStyles = createStyles((theme) => ({
  card: { gap: theme.spacing(2) },
  cardAlert: { borderColor: theme.colors.warning },
  header: { flexDirection: 'row', gap: theme.spacing(3), alignItems: 'flex-start' },
  headerText: { flex: 1, gap: theme.spacing(1) },
  title: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  subtitle: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 18 },
  more: { color: theme.colors.textMuted, fontSize: 13 },
}));
