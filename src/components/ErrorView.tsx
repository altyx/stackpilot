import { StyleSheet, Text } from 'react-native';
import { PortainerError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { theme } from '../theme';
import { Button } from './Button';
import { Centered } from './Centered';

export function ErrorView({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { signOut } = useAuth();
  const message = error instanceof Error ? error.message : 'Une erreur inattendue est survenue.';
  const detail =
    error && typeof error === 'object' && 'detail' in error ? String((error as { detail?: string }).detail ?? '') : '';
  // Un token expiré ou révoqué renvoie 401 à chaque essai : réessayer ne mène
  // nulle part, seule une nouvelle connexion débloque. La garde de navigation
  // racine renvoie vers /login dès que la session tombe.
  const unauthorized = error instanceof PortainerError && error.status === 401;
  return (
    <Centered>
      <Text style={styles.errorTitle}>{message}</Text>
      {detail ? <Text style={styles.errorDetail}>{detail}</Text> : null}
      {unauthorized ? (
        <Button label="Se reconnecter" onPress={() => void signOut()} style={styles.retry} />
      ) : onRetry ? (
        <Button label="Réessayer" onPress={onRetry} variant="secondary" style={styles.retry} />
      ) : null}
    </Centered>
  );
}

const styles = StyleSheet.create({
  errorTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  errorDetail: { color: theme.colors.textMuted, fontSize: 12, textAlign: 'center' },
  retry: { marginTop: theme.spacing(2), alignSelf: 'stretch' },
});
