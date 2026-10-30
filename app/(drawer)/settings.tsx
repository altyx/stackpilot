import { Alert, Linking, ScrollView, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { LATEST_RELEASE } from '../../src/changelog';
import { BuildInfo } from '../../src/components/BuildInfo';
import { Card } from '../../src/components/Card';
import { SettingsChoiceRow } from '../../src/components/SettingsChoiceRow';
import { SettingsNavRow } from '../../src/components/SettingsNavRow';
import { SettingsSelect } from '../../src/components/SettingsSelect';
import { Section } from '../../src/components/Section';
import { LANGUAGES, useStrings, type Strings } from '../../src/i18n';
import { SOURCE_CODE_URL } from '../../src/legal/publisher';
import { newIssueUrl } from '../../src/lib/support';
import { useSettings } from '../../src/settings/SettingsContext';
import { APPEARANCES, REFRESH_INTERVALS } from '../../src/settings/storage';
import { createStyles } from '../../src/theme';

/** App settings — Portainer's own settings stay in Portainer. */
export default function SettingsScreen() {
  const styles = useStyles();
  const t = useStrings();
  const { settings, update } = useSettings();
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Section title={t.settings.appearance}>
        <Card style={styles.card}>
          {APPEARANCES.map((appearance, index) => (
            <SettingsChoiceRow
              key={appearance}
              label={t.settings.appearances[appearance]}
              selected={settings.appearance === appearance}
              first={index === 0}
              onPress={() => update({ appearance })}
            />
          ))}
        </Card>
      </Section>

      <Section title={t.settings.language}>
        <Card style={styles.card}>
          <SettingsSelect
            title={t.settings.language}
            icon="language-outline"
            options={LANGUAGES}
            value={settings.language}
            onChange={(language) => update({ language })}
          />
        </Card>
      </Section>

      <Section title={t.settings.refresh}>
        <Text style={styles.hint}>{t.settings.refreshHint}</Text>
        <Card style={styles.card}>
          {REFRESH_INTERVALS.map((interval, index) => (
            <SettingsChoiceRow
              key={String(interval)}
              label={t.settings.interval(interval)}
              selected={settings.refreshIntervalMs === interval}
              first={index === 0}
              onPress={() => update({ refreshIntervalMs: interval })}
            />
          ))}
        </Card>
      </Section>

      <Section title={t.settings.notifications}>
        <Card style={styles.card}>
          <SettingsNavRow
            icon="notifications-outline"
            label={t.settings.alerts}
            hint={t.settings.alertsHint}
            onPress={() => router.push('/notifications')}
          />
        </Card>
      </Section>

      <Section title={t.settings.help}>
        <Card style={styles.card}>
          <SettingsNavRow
            icon="bug-outline"
            label={t.settings.reportProblem}
            hint={t.settings.reportProblemHint}
            external
            first
            onPress={() => openLink(newIssueUrl(), t)}
          />
          <SettingsNavRow
            icon="lock-closed-outline"
            label={t.settings.certificate}
            hint={t.settings.certificateHint}
            onPress={() => router.push('/certificates')}
          />
          <SettingsNavRow
            icon="logo-github"
            label={t.settings.sourceCode}
            external
            onPress={() => openLink(SOURCE_CODE_URL, t)}
          />
        </Card>
      </Section>

      <Section title={t.settings.about}>
        <Card style={styles.card}>
          <SettingsNavRow
            icon="sparkles-outline"
            label={t.settings.whatsNew}
            hint={t.settings.version(LATEST_RELEASE.version)}
            first
            onPress={() => router.push('/changelog')}
          />
          <SettingsNavRow
            icon="document-text-outline"
            label={t.settings.terms}
            onPress={() => router.push('/terms')}
          />
          <SettingsNavRow
            icon="shield-checkmark-outline"
            label={t.settings.privacy}
            onPress={() => router.push('/privacy')}
          />
        </Card>
        <BuildInfo />
      </Section>
    </ScrollView>
  );
}

function openLink(url: string, t: Strings): void {
  Linking.openURL(url).catch(() => Alert.alert(t.common.cannotOpenLink, t.common.noAppForLink));
}

const useStyles = createStyles((theme) => ({
  content: { padding: theme.spacing(4), gap: theme.spacing(6), paddingBottom: theme.spacing(8) },
  hint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: theme.spacing(1),
  },
  // The card carries the rows edge to edge: their own inner padding is enough.
  card: { padding: 0, overflow: 'hidden' },
}));
