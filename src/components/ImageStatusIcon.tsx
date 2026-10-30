import { ActivityIndicator, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ImageStatus } from '../api/types';
import { useTranslation } from 'react-i18next';
import { createStyles, useTheme } from '../theme';

const ICONS: Record<Exclude<ImageStatus, 'processing'>, { name: IconName; color: StatusColor }> = {
  updated: { name: 'checkmark-circle', color: 'success' },
  outdated: { name: 'arrow-up-circle', color: 'warning' },
  unknown: { name: 'help-circle-outline', color: 'textMuted' },
};

type StatusColor = 'success' | 'warning' | 'textMuted';
type IconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * Same icons as Portainer's "image up to date" column: a green tick when the
 * image matches its registry, an orange arrow when a newer one exists.
 */
export function ImageStatusIcon({
  status,
  withLabel = false,
  subject = 'container',
}: {
  status: ImageStatus;
  /** Spells the status out next to the icon, for the detail screen. */
  withLabel?: boolean;
  /** A stack holds several images: Portainer says outdated as soon as one is. */
  subject?: 'container' | 'stacks';
}) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useTranslation();
  const label = t(`${subject}.imageStatus.${status}`);
  const icon =
    status === 'processing' ? (
      <ActivityIndicator color={theme.colors.textMuted} size="small" />
    ) : (
      <Ionicons name={ICONS[status].name} size={18} color={theme.colors[ICONS[status].color]} />
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

const useStyles = createStyles((theme) => ({
  labelled: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1.5) },
  label: { color: theme.colors.textMuted, fontSize: 13 },
  labelOutdated: { color: 'warning' },
}));
