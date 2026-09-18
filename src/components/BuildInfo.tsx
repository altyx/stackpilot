import { StyleSheet, Text } from 'react-native';
import { versionLine } from '../lib/appInfo';
import { theme } from '../theme';

/**
 * "StackPilot 1.0.0 (57) · a1d8e36": the line to ask a tester who reports an
 * issue for — and the one "Report an issue" attaches on its own.
 */
export function BuildInfo() {
  return (
    <Text selectable style={styles.text}>
      {versionLine()}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: theme.spacing(4),
  },
});
