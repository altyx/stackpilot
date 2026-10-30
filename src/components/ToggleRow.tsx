import { Switch, Text, View } from 'react-native';
import { createStyles, useTheme } from '../theme';

export function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: theme.colors.surfaceAlt, true: theme.colors.dangerFill }}
      />
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(3) },
  text: { flex: 1, gap: theme.spacing(0.5) },
  label: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  hint: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17 },
}));
