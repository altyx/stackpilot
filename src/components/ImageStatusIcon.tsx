import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ImageStatus } from '../api/types';
import { theme } from '../theme';

export const IMAGE_STATUS_LABELS: Record<ImageStatus, string> = {
  updated: 'Image à jour',
  outdated: "Mise à jour de l'image disponible",
  processing: "Vérification de l'image…",
  unknown: "Statut de l'image indéterminé",
};

const ICONS: Record<Exclude<ImageStatus, 'processing'>, { name: IconName; color: string }> = {
  updated: { name: 'checkmark-circle', color: theme.colors.success },
  outdated: { name: 'arrow-up-circle', color: theme.colors.warning },
  unknown: { name: 'help-circle-outline', color: theme.colors.textMuted },
};

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * Same icons as Portainer's "image up to date" column: a green tick when the
 * image matches its registry, an orange arrow when a newer one exists.
 */
export function ImageStatusIcon({
  status,
  withLabel = false,
}: {
  status: ImageStatus;
  /** Spells the status out next to the icon, for the detail screen. */
  withLabel?: boolean;
}) {
  const label = IMAGE_STATUS_LABELS[status];
  const icon =
    status === 'processing' ? (
      <ActivityIndicator color={theme.colors.textMuted} size="small" />
    ) : (
      <Ionicons name={ICONS[status].name} size={18} color={ICONS[status].color} />
    );

  if (!withLabel) {
    return (
      <View accessibilityLabel={label} accessibilityRole="image">
        {icon}
      </View>
    );
  }

  return (
    <View style={styles.labelled}>
      {icon}
      <Text style={[styles.label, status === 'outdated' && styles.labelOutdated]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  labelled: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1.5) },
  label: { color: theme.colors.textMuted, fontSize: 13 },
  labelOutdated: { color: theme.colors.warning },
});
