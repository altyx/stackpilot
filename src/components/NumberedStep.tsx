import { Text, View } from 'react-native';
import { createStyles } from '../theme';
import { CodeBlock } from './CodeBlock';

/** Step of a setup guide, with the command it asks to type if any. */
export function NumberedStep({ n, text, code }: { n: number; text: string; code?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.step}>
      <Text style={styles.stepNumber}>{n}</Text>
      <View style={styles.stepBody}>
        <Text style={styles.stepText}>{text}</Text>
        {code ? <CodeBlock code={code} /> : null}
      </View>
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  step: { flexDirection: 'row', gap: theme.spacing(3), alignItems: 'flex-start' },
  stepNumber: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: '700',
    minWidth: 16,
  },
  stepBody: { flex: 1, gap: theme.spacing(2) },
  stepText: { color: theme.colors.text, fontSize: 13, lineHeight: 19 },
}));
