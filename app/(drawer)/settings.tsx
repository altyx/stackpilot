import { Alert, Linking, ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { LATEST_RELEASE } from '../../src/changelog';
import { BuildInfo } from '../../src/components/BuildInfo';
import { Card } from '../../src/components/Card';
import { SettingsChoiceRow } from '../../src/components/SettingsChoiceRow';
import { SettingsNavRow } from '../../src/components/SettingsNavRow';
import { Section } from '../../src/components/Section';
import { SOURCE_CODE_URL } from '../../src/legal/publisher';
import { newIssueUrl } from '../../src/lib/support';
import { useSettings } from '../../src/settings/SettingsContext';
import { REFRESH_INTERVALS } from '../../src/settings/storage';
import { theme } from '../../src/theme';

/** App settings — Portainer's own settings stay in Portainer. */
export default function SettingsScreen() {
  const { settings, update } = useSettings();
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Section title="Refresh">
        <Text style={styles.hint}>
          The container list updates on its own. A longer interval saves battery and mobile data; in
          manual mode, pull the list down to refresh it.
        </Text>
        <Card style={styles.card}>
          {REFRESH_INTERVALS.map((option, index) => (
            <SettingsChoiceRow
              key={option.label}
              label={option.label}
              selected={settings.refreshIntervalMs === option.value}
              first={index === 0}
              onPress={() => update({ refreshIntervalMs: option.value })}
            />
          ))}
        </Card>
      </Section>

      <Section title="Notifications">
        <Card style={styles.card}>
          <SettingsNavRow
            icon="notifications-outline"
            label="Alerts for your containers"
            hint="The token your monitoring service needs"
            onPress={() => router.push('/notifications')}
          />
        </Card>
      </Section>

      <Section title="Help">
        <Card style={styles.card}>
          <SettingsNavRow
            icon="bug-outline"
            label="Report a problem"
            hint="Opens GitHub with the version and device pre-filled — nothing about your instance"
            external
            first
            onPress={() => openLink(newIssueUrl())}
          />
          <SettingsNavRow
            icon="lock-closed-outline"
            label="HTTPS certificate"
            hint="Get this phone to trust a self-signed or private certificate"
            onPress={() => router.push('/certificates')}
          />
          <SettingsNavRow
            icon="logo-github"
            label="Source code"
            external
            onPress={() => openLink(SOURCE_CODE_URL)}
          />
        </Card>
      </Section>

      <Section title="About">
        <Card style={styles.card}>
          <SettingsNavRow
            icon="sparkles-outline"
            label="What's new"
            hint={`Version ${LATEST_RELEASE.version}`}
            first
            onPress={() => router.push('/changelog')}
          />
          <SettingsNavRow
            icon="document-text-outline"
            label="Terms of use"
            onPress={() => router.push('/terms')}
          />
          <SettingsNavRow
            icon="shield-checkmark-outline"
            label="Privacy policy"
            onPress={() => router.push('/privacy')}
          />
        </Card>
        <BuildInfo />
      </Section>
    </ScrollView>
  );
}

function openLink(url: string): void {
  Linking.openURL(url).catch(() =>
    Alert.alert('Cannot open link', 'No app can open this address.'),
  );
}

const styles = StyleSheet.create({
  content: { padding: theme.spacing(4), gap: theme.spacing(6), paddingBottom: theme.spacing(8) },
  hint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: theme.spacing(1),
  },
  // The card carries the rows edge to edge: their own inner padding is enough.
  card: { padding: 0, overflow: 'hidden' },
});
