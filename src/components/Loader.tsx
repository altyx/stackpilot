import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { theme } from '../theme';
import { Centered } from './Centered';

export function Loader({ label }: { label?: string }) {
  return (
    <Centered>
      <ActivityIndicator color={theme.colors.accent} size="large" />
      {label ? <Text style={styles.muted}>{label}</Text> : null}
    </Centered>
  );
}

const styles = StyleSheet.create({
  muted: { color: theme.colors.textMuted, fontSize: 14, textAlign: 'center' },
});
