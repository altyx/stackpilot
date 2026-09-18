import { StyleSheet, View } from 'react-native';
import { theme } from '../theme';

const STATE_COLORS: Record<string, string> = {
  running: theme.colors.success,
  restarting: theme.colors.warning,
  paused: theme.colors.warning,
  created: theme.colors.textMuted,
  exited: theme.colors.danger,
  dead: theme.colors.danger,
  removing: theme.colors.danger,
};

export function StatusDot({ state }: { state: string }) {
  return (
    <View
      style={[styles.dot, { backgroundColor: STATE_COLORS[state] ?? theme.colors.textMuted }]}
    />
  );
}

const styles = StyleSheet.create({
  dot: { width: 10, height: 10, borderRadius: 5 },
});
