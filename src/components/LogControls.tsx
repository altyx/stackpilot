import { StyleSheet, View } from 'react-native';
import { theme } from '../theme';
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
  return (
    <View style={styles.row}>
      <IconButton
        icon={follow ? 'pause' : 'play'}
        accessibilityLabel="Follow live"
        active={follow}
        onPress={onToggleFollow}
      />
      <IconButton
        icon="time-outline"
        accessibilityLabel="Show timestamps"
        active={timestamps}
        onPress={onToggleTimestamps}
      />
      <View style={styles.spacer} />
      <IconButton
        icon={copied ? 'checkmark' : 'copy-outline'}
        accessibilityLabel={copied ? 'Logs copied' : 'Copy logs'}
        disabled={disabled}
        onPress={onCopy}
      />
      <IconButton
        icon="share-outline"
        accessibilityLabel="Share logs"
        disabled={disabled}
        onPress={onShare}
      />
      <IconButton
        icon={fullscreen ? 'contract-outline' : 'expand-outline'}
        accessibilityLabel={fullscreen ? 'Exit full screen' : 'Full screen'}
        onPress={onToggleFullscreen}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2) },
  spacer: { flex: 1 },
});
