import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { NumberedStep } from '../src/components/NumberedStep';
import { registerForPush, type PushRegistration } from '../src/notifications/push';
import { theme } from '../src/theme';

export default function NotificationsScreen() {
  const [registration, setRegistration] = useState<PushRegistration | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleRegister() {
    setBusy(true);
    try {
      setRegistration(await registerForPush());
    } catch (error) {
      Alert.alert('Registration failed', error instanceof Error ? error.message : 'Unknown error.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy(token: string) {
    await Clipboard.setStringAsync(token);
    Alert.alert('Copied', 'The token is on the clipboard.');
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        Alerts are pushed by a service that watches the Docker event stream on your server. This
        screen provides the token that service needs to reach this device.
      </Text>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>This device&apos;s token</Text>

        {registration === null ? (
          <Text style={styles.muted}>Allow notifications to get this device&apos;s token.</Text>
        ) : registration.status === 'granted' ? (
          <>
            <Text selectable style={styles.token}>
              {registration.token}
            </Text>
            <Button label="Copy token" onPress={() => handleCopy(registration.token)} />
          </>
        ) : registration.status === 'denied' ? (
          <Text style={styles.warning}>
            Notifications are turned off. Turn them back on in the system settings, then register
            again.
          </Text>
        ) : (
          <Text style={styles.warning}>{registration.reason}</Text>
        )}

        {registration?.status !== 'granted' ? (
          <Button
            label="Allow notifications"
            onPress={handleRegister}
            loading={busy}
            variant={registration === null ? 'primary' : 'secondary'}
          />
        ) : null}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Setup</Text>
        <NumberedStep n={1} text="Deploy the watcher/ service on your server (see its README)." />
        <NumberedStep n={2} text="Paste this token into its EXPO_PUSH_TOKENS variable." />
        <NumberedStep
          n={3}
          text="The service alerts you when a container crashes, turns unhealthy, restarts or runs out of memory."
        />
      </Card>

      <Text style={styles.footnote}>
        Remote notifications need a physical device and a compiled build of the app: they work
        neither in a simulator nor in Expo Go.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: theme.spacing(4), gap: theme.spacing(3), paddingBottom: theme.spacing(10) },
  intro: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19 },
  card: { gap: theme.spacing(3) },
  sectionTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  muted: { color: theme.colors.textMuted, fontSize: 13 },
  warning: { color: theme.colors.warning, fontSize: 13, lineHeight: 19 },
  token: {
    backgroundColor: theme.colors.bg,
    borderRadius: theme.radius.sm,
    color: theme.colors.text,
    fontSize: 12,
    padding: theme.spacing(3),
  },
  footnote: { color: theme.colors.textMuted, fontSize: 11, lineHeight: 16 },
});
