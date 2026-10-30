import { Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useStrings } from '../i18n';
import type { StackOverview } from '../lib/stacks';
import { createStyles } from '../theme';
import { Card } from './Card';
import { StackImageStatus } from './StackImageStatus';
import { StackKindBadge } from './StackKindBadge';

export function StackCard({
  endpointId,
  overview,
}: {
  endpointId: number;
  overview: StackOverview;
}) {
  const styles = useStyles();
  const t = useStrings();
  const { name, kind, stack, running, total } = overview;
  return (
    <Link href={`/endpoints/${endpointId}/stacks/${encodeURIComponent(name)}`} asChild>
      <Pressable style={({ pressed }) => pressed && styles.pressed}>
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            {/* Only a stack Portainer manages has an image status to ask for. */}
            {stack ? <StackImageStatus endpointId={endpointId} stackId={stack.Id} /> : null}
            <StackKindBadge kind={kind} />
          </View>

          <Text style={[styles.count, countStyle(styles, running, total)]}>
            {total === 0 ? t.common.noContainers : t.common.runningRatio(running, total)}
          </Text>

          {stack ? (
            <Text style={styles.meta} numberOfLines={1}>
              {t.stacks.origin(
                stack.CreationDate > 0 ? t.date(stack.CreationDate) : null,
                stack.CreatedBy,
              )}
            </Text>
          ) : (
            <Text style={styles.meta}>{t.stacks.outsidePortainer}</Text>
          )}

          {stack?.GitConfig ? (
            <Text style={styles.meta} numberOfLines={1}>
              {t.stacks.git(
                stack.GitConfig.ReferenceName.replace(/^refs\/heads\//, ''),
                stack.AutoUpdate?.Interval,
              )}
            </Text>
          ) : null}
        </Card>
      </Pressable>
    </Link>
  );
}

function countStyle(styles: ReturnType<typeof useStyles>, running: number, total: number) {
  if (total === 0) return styles.countNone;
  if (running === total) return styles.countFull;
  return running === 0 ? styles.countNone : styles.countPartial;
}

const useStyles = createStyles((theme) => ({
  card: { gap: theme.spacing(1) },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2) },
  name: { color: theme.colors.text, fontSize: 15, fontWeight: '600', flex: 1 },
  count: { fontSize: 13, fontWeight: '600' },
  countFull: { color: theme.colors.success },
  countPartial: { color: theme.colors.warning },
  countNone: { color: theme.colors.textMuted },
  meta: { color: theme.colors.textMuted, fontSize: 12 },
  pressed: { opacity: 0.75 },
}));
