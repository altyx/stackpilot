import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NetworkSummary } from '../api/types';
import { isPredefinedNetwork, networkSubnets } from '../lib/networks';
import type { Usage } from '../lib/usage';
import { createStyles } from '../theme';
import { Card } from './Card';
import { UsageBadge } from './UsageBadge';

/** Read-only: Docker's name, driver, scope and subnets are shown as-is. */
export function NetworkCard({ usage }: { usage: Usage<NetworkSummary> }) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { item: network, usedBy } = usage;
  const meta = [
    network.Driver,
    network.Scope,
    network.Internal ? t('networks.internal') : null,
    network.Attachable ? t('networks.attachable') : null,
    network.EnableIPv6 ? 'IPv6' : null,
    isPredefinedNetwork(network) ? t('networks.predefined') : null,
  ].filter(Boolean);
  const subnets = networkSubnets(network);
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={2}>
          {network.Name}
        </Text>
        <UsageBadge usedBy={usedBy} kind="network" />
      </View>

      <Text style={styles.meta}>{meta.join(' · ')}</Text>

      {subnets.length > 0 ? (
        <Text style={styles.subnets} numberOfLines={2}>
          {subnets.join(', ')}
        </Text>
      ) : null}

      {usedBy.length > 0 ? (
        <Text style={styles.usedBy} numberOfLines={2}>
          {usedBy.join(', ')}
        </Text>
      ) : null}
    </Card>
  );
}

const useStyles = createStyles((theme) => ({
  card: { gap: theme.spacing(1) },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing(2) },
  name: { color: theme.colors.text, fontSize: 14, fontWeight: '600', flex: 1 },
  meta: { color: theme.colors.textMuted, fontSize: 12 },
  subnets: { color: theme.colors.textMuted, fontSize: 11 },
  usedBy: { color: theme.colors.text, fontSize: 12 },
}));
