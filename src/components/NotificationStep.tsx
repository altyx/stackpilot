import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

export function NotificationStep({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepNumber}>{n}</Text>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', gap: theme.spacing(3), alignItems: 'flex-start' },
  stepNumber: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: '700',
    minWidth: 16,
  },
  stepText: { color: theme.colors.text, fontSize: 13, lineHeight: 19, flex: 1 },
});
