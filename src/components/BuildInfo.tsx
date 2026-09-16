import { StyleSheet, Text } from 'react-native';
import { versionLine } from '../lib/appInfo';
import { theme } from '../theme';

/**
 * « StackPilot 1.0.0 (57) · a1d8e36 » : la ligne à demander à un testeur qui
 * signale un problème — et celle que « Signaler un problème » joint tout seul.
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
