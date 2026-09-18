import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import type { ContainerSummary } from '../api/types';
import { containerName } from '../lib/format';
import { theme } from '../theme';
import { Card } from './Card';
import { ContainerImageStatus } from './ContainerImageStatus';
import { StatusDot } from './StatusDot';

export function ContainerRow({
  endpointId,
  container,
}: {
  endpointId: number;
  container: ContainerSummary;
}) {
  return (
    <Link href={`/endpoints/${endpointId}/containers/${container.Id}`} asChild>
      <Pressable style={({ pressed }) => pressed && styles.pressed}>
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <StatusDot state={container.State} />
            <Text style={styles.name} numberOfLines={1}>
              {containerName(container)}
            </Text>
            <ContainerImageStatus endpointId={endpointId} containerId={container.Id} />
          </View>
          <Text style={styles.image} numberOfLines={1}>
            {container.Image}
          </Text>
          <Text style={styles.status} numberOfLines={1}>
            {container.Status}
          </Text>
        </Card>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing(1) },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2) },
  name: { color: theme.colors.text, fontSize: 15, fontWeight: '600', flex: 1 },
  image: { color: theme.colors.textMuted, fontSize: 12 },
  status: { color: theme.colors.textMuted, fontSize: 12 },
  pressed: { opacity: 0.75 },
});
