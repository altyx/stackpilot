import { useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { NumberedStep } from '../src/components/NumberedStep';
import { useStrings } from '../src/i18n';
import { registerForPush, type PushRegistration } from '../src/notifications/push';
import { createStyles } from '../src/theme';

export default function NotificationsScreen() {
  const styles = useStyles();
  const t = useStrings();
  const [registration, setRegistration] = useState<PushRegistration | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleRegister() {
    setBusy(true);
    try {
      setRegistration(await registerForPush());
    } catch (error) {
      Alert.alert(
        t.notifications.registrationFailed,
        error instanceof Error ? error.message : t.common.unknownError,
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy(token: string) {
    await Clipboard.setStringAsync(token);
    Alert.alert(t.common.copied, t.notifications.copiedMessage);
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.intro}>{t.notifications.intro}</Text>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>{t.notifications.tokenTitle}</Text>

        {registration === null ? (
          <Text style={styles.muted}>{t.notifications.allowToGetToken}</Text>
        ) : registration.status === 'granted' ? (
          <>
            <Text selectable style={styles.token}>
              {registration.token}
            </Text>
            <Button
              label={t.notifications.copyToken}
              onPress={() => handleCopy(registration.token)}
            />
          </>
        ) : registration.status === 'denied' ? (
          <Text style={styles.warning}>{t.notifications.denied}</Text>
        ) : (
          <Text style={styles.warning}>{registration.reason}</Text>
        )}

        {registration?.status !== 'granted' ? (
          <Button
            label={t.notifications.allow}
            onPress={handleRegister}
            loading={busy}
            variant={registration === null ? 'primary' : 'secondary'}
          />
        ) : null}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>{t.notifications.setup}</Text>
        {t.notifications.steps.map((step, index) => (
          <NumberedStep key={step} n={index + 1} text={step} />
        ))}
      </Card>

      <Text style={styles.footnote}>{t.notifications.footnote}</Text>
    </ScrollView>
  );
}

const useStyles = createStyles((theme) => ({
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
}));
