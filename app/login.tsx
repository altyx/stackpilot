import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { PortainerError } from '../src/api/client';
import { loginWithApiKey, loginWithPassword } from '../src/api/portainer';
import type { AuthMode } from '../src/api/types';
import { useAuth } from '../src/auth/AuthContext';
import { Button, Card } from '../src/components/ui';
import { theme } from '../src/theme';

export default function LoginScreen() {
  const { signIn, lastLogin, sessionExpired } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>(lastLogin?.mode ?? 'apiKey');
  const [baseUrl, setBaseUrl] = useState(lastLogin?.baseUrl ?? '');
  const [apiKey, setApiKey] = useState('');
  const [username, setUsername] = useState(lastLogin?.username ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<{ message: string; detail?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit =
    baseUrl.trim().length > 0 &&
    (mode === 'apiKey' ? apiKey.trim().length > 0 : username.trim().length > 0 && password.length > 0);

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    try {
      const session =
        mode === 'apiKey'
          ? await loginWithApiKey(baseUrl, apiKey)
          : await loginWithPassword(baseUrl, username.trim(), password);
      await signIn(session);
      setPassword('');
      router.replace('/endpoints');
    } catch (e) {
      setError({
        message: e instanceof Error ? e.message : 'Connexion impossible.',
        detail: e instanceof PortainerError ? e.detail : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Connexion à Portainer</Text>
        <Text style={styles.subtitle}>
          Les identifiants sont stockés dans le trousseau sécurisé de l&apos;appareil.
        </Text>

        {sessionExpired ? (
          <Text accessibilityRole="alert" style={styles.expired}>
            {lastLogin?.mode === 'jwt'
              ? 'Votre session a expiré. Reconnectez-vous pour continuer.'
              : "L'access token a été refusé par Portainer : il a probablement été révoqué."}
          </Text>
        ) : null}

        <Card style={styles.card}>
          <Field
            label="URL de l'instance"
            placeholder="https://portainer.local:9443"
            value={baseUrl}
            onChangeText={setBaseUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            textContentType="URL"
          />

          <View style={styles.segmented}>
            <ModeTab label="Access token" active={mode === 'apiKey'} onPress={() => setMode('apiKey')} />
            <ModeTab label="Identifiants" active={mode === 'jwt'} onPress={() => setMode('jwt')} />
          </View>

          {mode === 'apiKey' ? (
            <Field
              label="Access token"
              placeholder="ptr_…"
              value={apiKey}
              onChangeText={setApiKey}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
          ) : (
            <>
              <Field
                label="Utilisateur"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="username"
              />
              <Field
                label="Mot de passe"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textContentType="password"
              />
            </>
          )}

          {error ? (
            <View style={styles.errorBlock}>
              <Text style={styles.error}>{error.message}</Text>
              {error.detail ? <Text selectable style={styles.errorDetail}>{error.detail}</Text> : null}
            </View>
          ) : null}

          <Button
            label="Se connecter"
            onPress={handleSubmit}
            disabled={!canSubmit}
            loading={busy}
            style={styles.submit}
          />
        </Card>

        <Text style={styles.legal}>
          En vous connectant, vous acceptez les{' '}
          <Link href="/terms" style={styles.legalLink}>
            conditions générales d&apos;utilisation
          </Link>
          . Voir aussi la{' '}
          <Link href="/privacy" style={styles.legalLink}>
            politique de confidentialité
          </Link>
          .
        </Text>

        <Text style={styles.hint}>
          {mode === 'apiKey'
            ? 'Créez un access token depuis Portainer › My account › Access tokens. Il ne expire pas et reste révocable côté serveur.'
            : 'La connexion par identifiants ouvre une session JWT temporaire ; Portainer l’invalide au bout de quelques heures.'}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  ...inputProps
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...inputProps}
        style={styles.input}
        placeholderTextColor={theme.colors.textMuted}
      />
    </View>
  );
}

function ModeTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Text
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.modeTab, active && styles.modeTabActive]}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing(5), gap: theme.spacing(3), paddingBottom: theme.spacing(12) },
  title: { color: theme.colors.text, fontSize: 24, fontWeight: '700' },
  subtitle: { color: theme.colors.textMuted, fontSize: 14 },
  expired: {
    color: theme.colors.warning,
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    fontSize: 13,
    lineHeight: 18,
    padding: theme.spacing(3),
    overflow: 'hidden',
  },
  card: { gap: theme.spacing(4), marginTop: theme.spacing(2) },
  field: { gap: theme.spacing(1.5) },
  fieldLabel: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
  input: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    color: theme.colors.text,
    fontSize: 15,
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(3),
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    padding: theme.spacing(1),
    gap: theme.spacing(1),
  },
  modeTab: {
    flex: 1,
    textAlign: 'center',
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: theme.spacing(2.5),
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
  },
  modeTabActive: { backgroundColor: theme.colors.accent, color: theme.colors.text },
  errorBlock: { gap: theme.spacing(1) },
  error: { color: theme.colors.danger, fontSize: 13, lineHeight: 18 },
  errorDetail: { color: theme.colors.textMuted, fontSize: 11, lineHeight: 15 },
  submit: { marginTop: theme.spacing(1) },
  legal: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 18 },
  legalLink: { color: theme.colors.accent, fontWeight: '600' },
  hint: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 18 },
});
