import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Button, Card } from '../../src/components/ui';
import { registerForPush, type PushRegistration } from '../../src/notifications/push';
import { theme } from '../../src/theme';

export default function NotificationsScreen() {
  const [registration, setRegistration] = useState<PushRegistration | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleRegister() {
    setBusy(true);
    try {
      setRegistration(await registerForPush());
    } catch (error) {
      Alert.alert(
        'Enregistrement impossible',
        error instanceof Error ? error.message : 'Erreur inconnue.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy(token: string) {
    await Clipboard.setStringAsync(token);
    Alert.alert('Copié', 'Le jeton est dans le presse-papiers.');
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        Les alertes sont poussées par un service qui surveille le flux d&apos;événements Docker
        sur votre serveur. Cet écran fournit le jeton dont ce service a besoin pour joindre cet
        appareil.
      </Text>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Jeton de cet appareil</Text>

        {registration === null ? (
          <Text style={styles.muted}>
            Autorisez les notifications pour obtenir le jeton de cet appareil.
          </Text>
        ) : registration.status === 'granted' ? (
          <>
            <Text selectable style={styles.token}>
              {registration.token}
            </Text>
            <Button label="Copier le jeton" onPress={() => handleCopy(registration.token)} />
          </>
        ) : registration.status === 'denied' ? (
          <Text style={styles.warning}>
            Notifications refusées. Réactivez-les dans les réglages du système, puis relancez
            l&apos;enregistrement.
          </Text>
        ) : (
          <Text style={styles.warning}>{registration.reason}</Text>
        )}

        {registration?.status !== 'granted' ? (
          <Button
            label="Autoriser les notifications"
            onPress={handleRegister}
            loading={busy}
            variant={registration === null ? 'primary' : 'secondary'}
          />
        ) : null}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Mise en service</Text>
        <Step n={1} text="Déployez le service watcher/ sur votre serveur (voir son README)." />
        <Step n={2} text="Collez ce jeton dans sa variable EXPO_PUSH_TOKENS." />
        <Step
          n={3}
          text="Le service vous alerte sur un arrêt anormal, un passage en unhealthy, un redémarrage ou un dépassement mémoire."
        />
      </Card>

      <Text style={styles.footnote}>
        Les notifications distantes exigent un appareil physique et une version compilée de
        l&apos;application : elles ne fonctionnent ni en simulateur, ni dans Expo Go.
      </Text>
    </ScrollView>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepNumber}>{n}</Text>
      <Text style={styles.stepText}>{text}</Text>
    </View>
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
  step: { flexDirection: 'row', gap: theme.spacing(3), alignItems: 'flex-start' },
  stepNumber: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: '700',
    minWidth: 16,
  },
  stepText: { color: theme.colors.text, fontSize: 13, lineHeight: 19, flex: 1 },
  footnote: { color: theme.colors.textMuted, fontSize: 11, lineHeight: 16 },
});
