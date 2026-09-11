import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { theme } from '../theme';

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variantStyles[variant],
        pressed && styles.buttonPressed,
        inactive && styles.buttonDisabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={theme.colors.text} size="small" />
      ) : (
        <Text style={styles.buttonLabel}>{label}</Text>
      )}
    </Pressable>
  );
}

const STATE_COLORS: Record<string, string> = {
  running: theme.colors.success,
  restarting: theme.colors.warning,
  paused: theme.colors.warning,
  created: theme.colors.textMuted,
  exited: theme.colors.danger,
  dead: theme.colors.danger,
  removing: theme.colors.danger,
};

export function StatusDot({ state }: { state: string }) {
  return <View style={[styles.dot, { backgroundColor: STATE_COLORS[state] ?? theme.colors.textMuted }]} />;
}

export function Centered({ children }: { children: React.ReactNode }) {
  return <View style={styles.centered}>{children}</View>;
}

export function Loader({ label }: { label?: string }) {
  return (
    <Centered>
      <ActivityIndicator color={theme.colors.accent} size="large" />
      {label ? <Text style={styles.muted}>{label}</Text> : null}
    </Centered>
  );
}

export function ErrorView({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : 'Une erreur inattendue est survenue.';
  const detail =
    error && typeof error === 'object' && 'detail' in error ? String((error as { detail?: string }).detail ?? '') : '';
  return (
    <Centered>
      <Text style={styles.errorTitle}>{message}</Text>
      {detail ? <Text style={styles.errorDetail}>{detail}</Text> : null}
      {onRetry ? <Button label="Réessayer" onPress={onRetry} variant="secondary" style={styles.retry} /> : null}
    </Centered>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Centered>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}
    </Centered>
  );
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Text
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && styles.segmentActive]}>
            {option.label}
          </Text>
        );
      })}
    </View>
  );
}

/** Pastille « utilisé par N » / « inutilisé ». */
export function UsageBadge({ usedBy }: { usedBy: string[] }) {
  const used = usedBy.length > 0;
  return (
    <Text style={[styles.usageBadge, used ? styles.usageUsed : styles.usageUnused]}>
      {used ? `utilisé · ${usedBy.length}` : 'inutilisé'}
    </Text>
  );
}

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: theme.colors.accent },
  secondary: { backgroundColor: theme.colors.surfaceAlt, borderWidth: 1, borderColor: theme.colors.border },
  danger: { backgroundColor: theme.colors.danger },
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing(4),
  },
  button: {
    minHeight: 46,
    paddingHorizontal: theme.spacing(4),
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { opacity: 0.75 },
  buttonDisabled: { opacity: 0.45 },
  buttonLabel: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  segmented: { flexDirection: 'row', gap: theme.spacing(2) },
  segment: {
    flex: 1,
    textAlign: 'center',
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    paddingVertical: theme.spacing(2),
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceAlt,
    overflow: 'hidden',
  },
  segmentActive: { backgroundColor: theme.colors.accent, color: theme.colors.text },
  usageBadge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
  },
  usageUsed: { backgroundColor: theme.colors.accentDim, color: theme.colors.text },
  usageUnused: { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.warning },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(6),
    gap: theme.spacing(3),
  },
  muted: { color: theme.colors.textMuted, fontSize: 14, textAlign: 'center' },
  errorTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  errorDetail: { color: theme.colors.textMuted, fontSize: 12, textAlign: 'center' },
  retry: { marginTop: theme.spacing(2), alignSelf: 'stretch' },
  emptyTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing(4),
    paddingVertical: theme.spacing(2),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  rowLabel: { color: theme.colors.textMuted, fontSize: 13 },
  rowValue: { color: theme.colors.text, fontSize: 13, flexShrink: 1, textAlign: 'right' },
});
