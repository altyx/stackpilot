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
        accessibilityLabel="Suivre en direct"
        active={follow}
        onPress={onToggleFollow}
      />
      <IconButton
        icon="time-outline"
        accessibilityLabel="Afficher l'heure"
        active={timestamps}
        onPress={onToggleTimestamps}
      />
      <View style={styles.spacer} />
      <IconButton
        icon={copied ? 'checkmark' : 'copy-outline'}
        accessibilityLabel={copied ? 'Logs copiés' : 'Copier les logs'}
        disabled={disabled}
        onPress={onCopy}
      />
      <IconButton
        icon="share-outline"
        accessibilityLabel="Partager les logs"
        disabled={disabled}
        onPress={onShare}
      />
      <IconButton
        icon={fullscreen ? 'contract-outline' : 'expand-outline'}
        accessibilityLabel={fullscreen ? 'Quitter le plein écran' : 'Plein écran'}
        onPress={onToggleFullscreen}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2) },
  spacer: { flex: 1 },
});
