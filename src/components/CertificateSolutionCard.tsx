import { StyleSheet, Text } from 'react-native';
import type { CertificateSolution } from '../help/certificates';
import { theme } from '../theme';
import { Card } from './Card';
import { NumberedStep } from './NumberedStep';

export function CertificateSolutionCard({ solution }: { solution: CertificateSolution }) {
  return (
    <Card style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>
        {solution.title}
      </Text>
      <Text style={styles.bestFor}>{solution.bestFor}</Text>
      <Text style={styles.summary}>{solution.summary}</Text>
      {solution.steps.map((step, index) => (
        <NumberedStep key={step.text} n={index + 1} text={step.text} code={step.code} />
      ))}
      {solution.note ? <Text style={styles.note}>{solution.note}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing(3) },
  title: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  bestFor: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: '600',
    marginTop: -theme.spacing(2),
  },
  summary: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19 },
  note: { color: theme.colors.warning, fontSize: 12, lineHeight: 17 },
});
