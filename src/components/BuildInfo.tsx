import { Text } from 'react-native';
import { versionLine } from '../lib/appInfo';
import { createStyles } from '../theme';

/**
 * "StackPilot 1.0.0 (57) · a1d8e36": the line to ask a tester who reports an
 * issue for — and the one "Report an issue" attaches on its own.
 */
export function BuildInfo() {
  const styles = useStyles();
  return (
    <Text selectable style={styles.text}>
      {versionLine()}
    </Text>
  );
}

const useStyles = createStyles((theme) => ({
  text: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: theme.spacing(4),
  },
}));
