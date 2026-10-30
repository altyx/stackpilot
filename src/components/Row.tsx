import { StyleSheet, Text, View } from 'react-native';
import { createStyles } from '../theme';

export function Row({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

const useStyles = createStyles((theme) => ({
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
}));
