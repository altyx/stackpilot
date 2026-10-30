import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { createStyles } from '../theme';
import { IconButton } from './IconButton';

/** Same controls inline and full screen, so nothing is relearned when expanding. */
export function LogControls({
  follow,
  onToggleFollow,
  timestamps,
  onToggleTimestamps,
  copied,
  onCopy,
  onShare,
  fullscreen,
  onToggleFullscreen,
  disabled,
}: {
  follow: boolean;
  onToggleFollow: () => void;
  timestamps: boolean;
  onToggleTimestamps: () => void;
  copied: boolean;
  onCopy: () => void;
  onShare: () => void;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  /** Nothing to copy or share yet. */
  disabled: boolean;
}) {
  const styles = useStyles();
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      <IconButton
        icon={follow ? 'pause' : 'play'}
        accessibilityLabel={t('logs.follow')}
        active={follow}
        onPress={onToggleFollow}
      />
      <IconButton
        icon="time-outline"
        accessibilityLabel={t('logs.timestamps')}
        active={timestamps}
        onPress={onToggleTimestamps}
      />
      <View style={styles.spacer} />
      <IconButton
        icon={copied ? 'checkmark' : 'copy-outline'}
        accessibilityLabel={copied ? t('logs.copied') : t('logs.copy')}
        disabled={disabled}
        onPress={onCopy}
      />
      <IconButton
        icon="share-outline"
        accessibilityLabel={t('logs.share')}
        disabled={disabled}
        onPress={onShare}
      />
      <IconButton
        icon={fullscreen ? 'contract-outline' : 'expand-outline'}
        accessibilityLabel={fullscreen ? t('logs.exitFullscreen') : t('logs.fullscreen')}
        onPress={onToggleFullscreen}
      />
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2) },
  spacer: { flex: 1 },
}));
