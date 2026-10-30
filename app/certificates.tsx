import { Platform, ScrollView, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card } from '../src/components/Card';
import { CertificateSolutionCard } from '../src/components/CertificateSolutionCard';
import { NumberedStep } from '../src/components/NumberedStep';
import { certificateHelp } from '../src/help/certificates';
import { createStyles } from '../src/theme';

/** Reachable from the login screen too, without a session. */
export default function CertificatesScreen() {
  const styles = useStyles();
  const { t } = useTranslation();
  const help = certificateHelp(t, Platform.OS === 'android' ? 'android' : 'ios');

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.intro}>{help.intro}</Text>

      {help.solutions.map((solution) => (
        <CertificateSolutionCard key={solution.id} solution={solution} />
      ))}

      <Card style={styles.card}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {help.deviceTrustTitle}
        </Text>
        {help.deviceTrustSteps.map((step, index) => (
          <NumberedStep key={step.text} n={index + 1} text={step.text} code={step.code} />
        ))}
      </Card>

      <Text style={styles.footnote}>{help.footnote}</Text>
    </ScrollView>
  );
}

const useStyles = createStyles((theme) => ({
  content: { padding: theme.spacing(4), gap: theme.spacing(3), paddingBottom: theme.spacing(10) },
  intro: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19 },
  card: { gap: theme.spacing(3) },
  sectionTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  footnote: { color: theme.colors.textMuted, fontSize: 11, lineHeight: 16 },
}));
