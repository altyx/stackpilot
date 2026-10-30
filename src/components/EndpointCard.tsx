import { Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import type { Endpoint } from '../api/types';
import { useStrings } from '../i18n';
import { isKubernetes, isOnline } from '../lib/endpoints';
import { createStyles } from '../theme';
import { Card } from './Card';

export function EndpointCard({ endpoint, current }: { endpoint: Endpoint; current: boolean }) {
  const styles = useStyles();
  const t = useStrings();
  const snapshot = endpoint.Snapshots?.[0];
  const kubernetes = isKubernetes(endpoint);
  const online = isOnline(endpoint);

  const card = (
    <Card style={[styles.card, current && styles.cardCurrent]}>
      <View style={styles.cardHeader}>
        <Text style={styles.name} numberOfLines={1}>
          {endpoint.Name}
        </Text>
        <Text style={[styles.badge, online ? styles.badgeUp : styles.badgeDown]}>
          {online ? t.endpoints.online : t.endpoints.offline}
        </Text>
      </View>
      <Text style={styles.url} numberOfLines={1}>
        {endpoint.URL || t.endpoints.localSocket}
      </Text>
      {kubernetes ? (
        <Text style={styles.unsupported}>{t.endpoints.kubernetes}</Text>
      ) : (
        <Text style={styles.stats}>
          {snapshot
            ? t.endpoints.snapshot(
                snapshot.RunningContainerCount ?? 0,
                snapshot.StoppedContainerCount ?? 0,
                snapshot.ImageCount ?? 0,
              )
            : t.endpoints.noSnapshot}
        </Text>
      )}
    </Card>
  );

  if (kubernetes || !online) return <View style={styles.disabled}>{card}</View>;

  return (
    <Link href={`/endpoints/${endpoint.Id}/overview`} asChild>
      <Pressable style={({ pressed }) => pressed && styles.pressed}>{card}</Pressable>
    </Link>
  );
}

const useStyles = createStyles((theme) => ({
  card: { gap: theme.spacing(1.5) },
  // Marks the environment the drawer entries point to.
  cardCurrent: { borderColor: theme.colors.accent },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2) },
  name: { color: theme.colors.text, fontSize: 16, fontWeight: '600', flex: 1 },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
  },
  badgeUp: { backgroundColor: theme.colors.accentDim, color: theme.colors.text },
  badgeDown: { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.textMuted },
  url: { color: theme.colors.textMuted, fontSize: 12 },
  stats: { color: theme.colors.text, fontSize: 13 },
  unsupported: { color: theme.colors.warning, fontSize: 12 },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.75 },
}));
