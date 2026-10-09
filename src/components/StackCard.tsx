import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { formatDate } from '../lib/format';
import type { StackOverview } from '../lib/stacks';
import { theme } from '../theme';
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

          <Text style={[styles.count, countStyle(running, total)]}>
            {describeCount(running, total)}
          </Text>

          {stack ? (
            <Text style={styles.meta} numberOfLines={1}>
              {describeOrigin(stack.CreationDate, stack.CreatedBy)}
            </Text>
          ) : (
            <Text style={styles.meta}>Deployed outside Portainer</Text>
          )}

          {stack?.GitConfig ? (
            <Text style={styles.meta} numberOfLines={1}>
              Git · {stack.GitConfig.ReferenceName.replace(/^refs\/heads\//, '')}
              {stack.AutoUpdate?.Interval
                ? ` · auto update every ${stack.AutoUpdate.Interval}`
                : ''}
            </Text>
          ) : null}
        </Card>
      </Pressable>
    </Link>
  );
}

export function describeCount(running: number, total: number): string {
  if (total === 0) return 'No containers';
  return `${running}/${total} running`;
}

function countStyle(running: number, total: number) {
  if (total === 0) return styles.countNone;
  if (running === total) return styles.countFull;
  return running === 0 ? styles.countNone : styles.countPartial;
}

function describeOrigin(creationDate: number, createdBy: string): string {
  const parts = [];
  if (creationDate > 0) parts.push(`Created ${formatDate(creationDate)}`);
  if (createdBy) parts.push(`by ${createdBy}`);
  return parts.join(' ') || 'Managed by Portainer';
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing(1) },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2) },
  name: { color: theme.colors.text, fontSize: 15, fontWeight: '600', flex: 1 },
  count: { fontSize: 13, fontWeight: '600' },
  countFull: { color: theme.colors.success },
  countPartial: { color: theme.colors.warning },
  countNone: { color: theme.colors.textMuted },
  meta: { color: theme.colors.textMuted, fontSize: 12 },
  pressed: { opacity: 0.75 },
});
