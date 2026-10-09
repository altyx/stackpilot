import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { PortainerError } from '../src/api/client';
import { loginWithApiKey, loginWithPassword } from '../src/api/portainer';
import type { AuthMode } from '../src/api/types';
import { useAuth } from '../src/auth/AuthContext';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { LoginField } from '../src/components/LoginField';
import { LoginModeTab } from '../src/components/LoginModeTab';
import { theme } from '../src/theme';

export default function LoginScreen() {
  const { signIn, lastLogin, sessionExpired } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>(lastLogin?.mode ?? 'apiKey');
  const [baseUrl, setBaseUrl] = useState(lastLogin?.baseUrl ?? '');
  const [apiKey, setApiKey] = useState('');
  const [username, setUsername] = useState(lastLogin?.username ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<{
    message: string;
    detail?: string;
    certificate?: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit =
    baseUrl.trim().length > 0 &&
    (mode === 'apiKey'
      ? apiKey.trim().length > 0
      : username.trim().length > 0 && password.length > 0);

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
      router.replace('/');
    } catch (e) {
      setError({
        message: e instanceof Error ? e.message : 'Unable to sign in.',
        detail: e instanceof PortainerError ? e.detail : undefined,
        certificate: e instanceof PortainerError && e.reason === 'certificate',
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
        <Text style={styles.title}>Sign in to Portainer</Text>
        <Text style={styles.subtitle}>
          Credentials are stored in the device&apos;s secure keychain.
        </Text>

        {sessionExpired ? (
          <Text accessibilityRole="alert" style={styles.expired}>
            {lastLogin?.mode === 'jwt'
              ? 'Your session has expired. Sign in again to continue.'
              : 'Portainer rejected the access token: it has probably been revoked.'}
          </Text>
        ) : null}

        <Card style={styles.card}>
          <LoginField
            label="Instance URL"
            placeholder="https://portainer.local:9443"
            value={baseUrl}
            onChangeText={setBaseUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            textContentType="URL"
          />

          <View style={styles.segmented}>
            <LoginModeTab
              label="Access token"
              active={mode === 'apiKey'}
              onPress={() => setMode('apiKey')}
            />
            <LoginModeTab
              label="Credentials"
              active={mode === 'jwt'}
              onPress={() => setMode('jwt')}
            />
          </View>

          {mode === 'apiKey' ? (
            <LoginField
              label="Access token"
              placeholder="ptr_…"
              value={apiKey}
              onChangeText={setApiKey}
              secret
            />
          ) : (
            <>
              <LoginField
                label="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="username"
              />
              <LoginField
                label="Password"
                value={password}
                onChangeText={setPassword}
                secret
                textContentType="password"
              />
            </>
          )}

          {error ? (
            <View style={styles.errorBlock}>
              <Text style={styles.error}>{error.message}</Text>
              {error.detail ? (
                <Text selectable style={styles.errorDetail}>
                  {error.detail}
                </Text>
              ) : null}
              {error.certificate ? (
                <Link href="/certificates" style={styles.errorLink}>
                  Fix a certificate problem
                </Link>
              ) : null}
            </View>
          ) : null}

          <Button
            label="Sign in"
            onPress={handleSubmit}
            disabled={!canSubmit}
            loading={busy}
            style={styles.submit}
          />
        </Card>

        <Text style={styles.legal}>
          By signing in, you accept the{' '}
          <Link href="/terms" style={styles.legalLink}>
            terms of use
          </Link>
          . See also the{' '}
          <Link href="/privacy" style={styles.legalLink}>
            privacy policy
          </Link>
          .
        </Text>

        <Text style={styles.hint}>
          {mode === 'apiKey'
            ? 'Create an access token in Portainer › My account › Access tokens. It never expires and can be revoked on the server.'
            : 'Signing in with credentials opens a temporary JWT session; Portainer ends it after a few hours.'}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
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
  segmented: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    padding: theme.spacing(1),
    gap: theme.spacing(1),
  },
  errorBlock: { gap: theme.spacing(1) },
  error: { color: theme.colors.danger, fontSize: 13, lineHeight: 18 },
  errorDetail: { color: theme.colors.textMuted, fontSize: 11, lineHeight: 15 },
  errorLink: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: '600',
    paddingVertical: theme.spacing(1),
  },
  submit: { marginTop: theme.spacing(1) },
  legal: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 18 },
  legalLink: { color: theme.colors.accent, fontWeight: '600' },
  hint: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 18 },
});
