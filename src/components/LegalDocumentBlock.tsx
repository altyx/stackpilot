import { StyleSheet, Text, View } from 'react-native';
import type { LegalBlock } from '../legal/document';
import { theme } from '../theme';

export function LegalDocumentBlock({ block }: { block: LegalBlock }) {
  if (typeof block === 'string') {
    return (
      <Text selectable style={styles.paragraph}>
        {block}
      </Text>
    );
  }
  return (
    <View style={styles.list}>
      {block.map((item) => (
        <View key={item} style={styles.listItem}>
          <Text style={styles.bullet}>•</Text>
          <Text selectable style={[styles.paragraph, styles.listText]}>
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  paragraph: { color: theme.colors.text, fontSize: 14, lineHeight: 21 },
  list: { gap: theme.spacing(1.5) },
  listItem: { flexDirection: 'row', gap: theme.spacing(2) },
  bullet: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 21 },
  listText: { flex: 1 },
});
