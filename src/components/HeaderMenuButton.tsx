import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';
import { theme } from '../theme';

/** "More actions" button for a screen header: present, but never in the way. */
export function HeaderMenuButton({
  accessibilityLabel,
  onPress,
  disabled,
}: {
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={12}
      onPress={onPress}
      style={({ pressed }) => [styles.button, (pressed || disabled) && styles.dimmed]}>
      {/* Plain dots: iOS already draws a round button around header items. */}
      <Ionicons name="ellipsis-horizontal" size={22} color={theme.colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { paddingHorizontal: theme.spacing(1) },
  dimmed: { opacity: 0.45 },
});
