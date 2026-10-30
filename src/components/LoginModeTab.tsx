import { Text } from 'react-native';
import { createStyles } from '../theme';

export function LoginModeTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();
  return (
    <Text
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.modeTab, active && styles.modeTabActive]}>
      {label}
    </Text>
  );
}

const useStyles = createStyles((theme) => ({
  modeTab: {
    flex: 1,
    textAlign: 'center',
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: theme.spacing(2.5),
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
  },
  modeTabActive: { backgroundColor: theme.colors.accentFill, color: theme.colors.onFill },
}));
