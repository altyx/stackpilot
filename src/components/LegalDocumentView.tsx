import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { LegalDocument } from '../legal/document';
import { theme } from '../theme';
import { LegalDocumentBlock } from './LegalDocumentBlock';

/** Affiche un texte légal : titre, date de mise à jour, puis sections numérotées. */
export function LegalDocumentView({ document }: { document: LegalDocument }) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          {document.title}
        </Text>
        <Text style={styles.updated}>Dernière mise à jour : {document.updatedAt}</Text>
      </View>

      <Text selectable style={styles.paragraph}>
        {document.intro}
      </Text>

      {document.sections.map((section, index) => (
        <View key={section.title} style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {index + 1}. {section.title}
          </Text>
          {section.body.map((block, blockIndex) => (
            <LegalDocumentBlock key={blockIndex} block={block} />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: theme.spacing(5), gap: theme.spacing(5), paddingBottom: theme.spacing(12) },
  header: { gap: theme.spacing(1) },
  title: { color: theme.colors.text, fontSize: 24, fontWeight: '700' },
  updated: { color: theme.colors.textMuted, fontSize: 12 },
  section: { gap: theme.spacing(2) },
  sectionTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '600' },
  paragraph: { color: theme.colors.text, fontSize: 14, lineHeight: 21 },
});
