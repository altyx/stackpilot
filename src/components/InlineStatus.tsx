import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

/**
 * Loading or failure inside one overview card. Each card fetches on its own:
 * a slow disk scan or a refused stats call shouldn't blank the whole screen.
 */
export function InlineStatus({
  loading,
  error,
  onRetry,
}: {
  loading?: string;
  error?: unknown;
  onRetry?: () => void;
}) {
  if (error) {
    return (
      <View style={styles.row}>
        <Text style={styles.error}>
          {error instanceof Error ? error.message : 'Données indisponibles.'}
        </Text>
        {onRetry ? (
          <Text accessibilityRole="button" onPress={onRetry} style={styles.retry}>
            Réessayer
          </Text>
        ) : null}
      </View>
    );
  }
  return (
    <View style={styles.row}>
      <ActivityIndicator size="small" color={theme.colors.textMuted} />
      <Text style={styles.loading}>{loading}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2), flexWrap: 'wrap' },
  loading: { color: theme.colors.textMuted, fontSize: 13 },
  error: { color: theme.colors.warning, fontSize: 13, lineHeight: 18, flexShrink: 1 },
  retry: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: '600',
    paddingVertical: theme.spacing(1),
  },
});
