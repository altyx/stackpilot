import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';

type StatusColor = 'success' | 'warning' | 'danger' | 'textMuted';

const STATE_COLORS: Record<string, StatusColor> = {
  running: 'success',
  restarting: 'warning',
  paused: 'warning',
  created: 'textMuted',
  exited: 'danger',
  dead: 'danger',
  removing: 'danger',
};

export function StatusDot({ state }: { state: string }) {
  const theme = useTheme();
  return (
    <View
      style={[styles.dot, { backgroundColor: theme.colors[STATE_COLORS[state] ?? 'textMuted'] }]}
    />
  );
}

const styles = StyleSheet.create({
  dot: { width: 10, height: 10, borderRadius: 5 },
});
