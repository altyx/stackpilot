import { ActivityIndicator, Text } from 'react-native';
import { createStyles, useTheme } from '../theme';
import { Centered } from './Centered';

export function Loader({ label }: { label?: string }) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <Centered>
      <ActivityIndicator color={theme.colors.accent} size="large" />
      {label ? <Text style={styles.muted}>{label}</Text> : null}
    </Centered>
  );
}

const useStyles = createStyles((theme) => ({
  muted: { color: theme.colors.textMuted, fontSize: 14, textAlign: 'center' },
}));
