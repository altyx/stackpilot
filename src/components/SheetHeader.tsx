import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

export function SheetHeader({ title, message }: { title: string; message?: string }) {
  return (
    <View style={styles.header}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: theme.spacing(1.5) },
  title: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
  message: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 20 },
});
