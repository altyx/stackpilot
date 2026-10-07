import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ContainerSummary } from '../api/types';
import { containerName } from '../lib/format';
import { theme } from '../theme';
import { StatusDot } from './StatusDot';

/**
 * Compact container line inside an overview card, opening its detail screen.
 * Router rather than `Link asChild`, which would drop the row's function style.
 */
export function ContainerLinkRow({
  endpointId,
  container,
  detail,
  tone = 'muted',
}: {
  endpointId: number;
  container: ContainerSummary;
  detail: string;
  tone?: 'muted' | 'warning';
}) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push(`/endpoints/${endpointId}/containers/${container.Id}`)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <StatusDot state={container.State} />
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {containerName(container)}
        </Text>
        <Text style={[styles.detail, tone === 'warning' && styles.warning]} numberOfLines={1}>
          {detail}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(3),
    paddingVertical: theme.spacing(2),
  },
  pressed: { opacity: 0.75 },
  text: { flex: 1, gap: theme.spacing(0.5) },
  name: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  detail: { color: theme.colors.textMuted, fontSize: 12 },
  warning: { color: theme.colors.warning },
});
