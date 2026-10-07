import { StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '../theme';

/**
 * Last guard before deleting data: the user types a phrase. A tap can slip,
 * typing a name can't. The match ignores case and surrounding spaces, so the
 * keyboard's auto-capitalisation doesn't fight the user. No placeholder: the
 * phrase greyed in the field reads as already typed.
 */
export function TypedConfirmation({
  phrase,
  value,
  onChange,
}: {
  phrase: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <View style={styles.block}>
      <Text style={styles.label}>
        Pour confirmer, saisissez <Text style={styles.phrase}>{phrase}</Text>
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        accessibilityLabel={`Saisissez ${phrase} pour confirmer`}
        style={styles.input}
      />
    </View>
  );
}

export function matchesPhrase(value: string, phrase: string): boolean {
  return value.trim().toLowerCase() === phrase.trim().toLowerCase();
}

const styles = StyleSheet.create({
  block: { gap: theme.spacing(2) },
  label: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 18 },
  phrase: { color: theme.colors.text, fontWeight: '600' },
  input: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.borderStrong,
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    color: theme.colors.text,
    fontSize: 15,
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(2.5),
  },
});
