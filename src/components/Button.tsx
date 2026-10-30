import { ActivityIndicator, Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';
import { createStyles, useTheme } from '../theme';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const variantStyles = useVariantStyles();
  const styles = useStyles();
  const inactive = disabled || loading;
  const filled = variant !== 'secondary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variantStyles[variant],
        pressed && styles.buttonPressed,
        inactive && styles.buttonDisabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={filled ? theme.colors.onFill : theme.colors.text} size="small" />
      ) : (
        <Text style={[styles.buttonLabel, filled && styles.buttonLabelOnFill]}>{label}</Text>
      )}
    </Pressable>
  );
}

const useVariantStyles = createStyles((theme) => ({
  primary: { backgroundColor: theme.colors.accentFill },
  secondary: {
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  danger: { backgroundColor: theme.colors.dangerFill },
}));

const useStyles = createStyles((theme) => ({
  button: {
    minHeight: 46,
    paddingHorizontal: theme.spacing(4),
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { opacity: 0.75 },
  buttonDisabled: { opacity: 0.45 },
  buttonLabel: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  buttonLabelOnFill: { color: theme.colors.onFill },
}));
