import { Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { Card } from '../src/components/Card';
import { CertificateSolutionCard } from '../src/components/CertificateSolutionCard';
import { NumberedStep } from '../src/components/NumberedStep';
import {
  CERTIFICATE_HELP_FOOTNOTE,
  CERTIFICATE_HELP_INTRO,
  CERTIFICATE_SOLUTIONS,
  DEVICE_TRUST_STEPS,
  DEVICE_TRUST_TITLE,
} from '../src/help/certificates';
import { theme } from '../src/theme';

/** Reachable from the login screen too, without a session. */
export default function CertificatesScreen() {
  // Only this device's steps: the other platform's settings paths are noise here.
  const deviceSteps = DEVICE_TRUST_STEPS[Platform.OS === 'android' ? 'android' : 'ios'];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.intro}>{CERTIFICATE_HELP_INTRO}</Text>

      {CERTIFICATE_SOLUTIONS.map((solution) => (
        <CertificateSolutionCard key={solution.id} solution={solution} />
      ))}

      <Card style={styles.card}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {DEVICE_TRUST_TITLE}
        </Text>
        {deviceSteps.map((step, index) => (
          <NumberedStep key={step.text} n={index + 1} text={step.text} code={step.code} />
        ))}
      </Card>

      <Text style={styles.footnote}>{CERTIFICATE_HELP_FOOTNOTE}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: theme.spacing(4), gap: theme.spacing(3), paddingBottom: theme.spacing(10) },
  intro: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19 },
  card: { gap: theme.spacing(3) },
  sectionTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  footnote: { color: theme.colors.textMuted, fontSize: 11, lineHeight: 16 },
});
