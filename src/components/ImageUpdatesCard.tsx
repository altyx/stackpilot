import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useImageUpdates } from '../api/hooks';
import type { ContainerSummary } from '../api/types';
import { useTranslation } from 'react-i18next';
import { createStyles, useTheme } from '../theme';
import { Card } from './Card';
import { InlineStatus } from './InlineStatus';

/**
 * How many images have a newer version in their registry. The detail lives
 * on the images screen, filtered on them: the overview only says whether to go.
 */
export function ImageUpdatesCard({
  endpointId,
  containers,
}: {
  endpointId: number;
  containers: ContainerSummary[];
}) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useTranslation();
  const updates = useImageUpdates(endpointId, containers);
  const router = useRouter();

  if (!updates.enabled) {
    return (
      <Card>
        <Text style={styles.muted}>{t('overview.updatesUnsupported')}</Text>
      </Card>
    );
  }
  if (updates.isPending) {
    return (
      <Card>
        <InlineStatus loading={t('overview.comparing')} />
      </Card>
    );
  }

  const count = updates.outdatedImageIds.length;
  if (count === 0) {
    return (
      <Card style={styles.row}>
        <Ionicons name="checkmark-circle-outline" size={22} color={theme.colors.success} />
        <Text style={styles.title}>{t('overview.allUpToDate')}</Text>
      </Card>
    );
  }

  const label = t('overview.toUpdate', { count });
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => router.push(`/endpoints/${endpointId}/images?filter=outdated`)}
      style={({ pressed }) => pressed && styles.pressed}>
      <Card style={styles.row}>
        <Ionicons name="arrow-up-circle-outline" size={22} color={theme.colors.accent} />
        <View style={styles.text}>
          <Text style={styles.title}>{label}</Text>
          <Text style={styles.muted}>{t('overview.seeWhich')}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
      </Card>
    </Pressable>
  );
}

const useStyles = createStyles((theme) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(3) },
  text: { flex: 1, gap: theme.spacing(0.5) },
  title: { color: theme.colors.text, fontSize: 14, fontWeight: '600', flexShrink: 1 },
  muted: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19 },
  pressed: { opacity: 0.75 },
}));
