import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { StyleSheet, Text } from 'react-native';
import { theme } from '../theme';

/**
 * « StackPilot 1.0.0 (57) · a1d8e36 » : version et numéro de build lus dans le
 * binaire installé, commit gravé par `app.config.ts`. C'est la ligne à demander
 * à un testeur qui signale un problème.
 */
export function BuildInfo() {
  const version = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '?';
  const number = Application.nativeBuildVersion;
  const commit = (Constants.expoConfig?.extra as { build?: { commit?: string | null } } | undefined)
    ?.build?.commit;

  const parts = [`StackPilot ${version}${number ? ` (${number})` : ''}`];
  if (commit) parts.push(commit);

  return (
    <Text selectable style={styles.text}>
      {parts.join(' · ')}
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
