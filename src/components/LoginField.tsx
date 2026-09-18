import { useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../theme';

/**
 * Labeled field. A `secret` field is masked by default, with a button to
 * reveal it in clear while checking what was typed.
 */
export function LoginField({
  label,
  secret = false,
  ...inputProps
}: { label: string; secret?: boolean } & Omit<ComponentProps<typeof TextInput>, 'secureTextEntry'>) {
  const [revealed, setRevealed] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputFrame}>
        <TextInput
          {...inputProps}
          // Shown in clear, a secret must be neither auto-capitalized nor
          // auto-corrected by the keyboard.
          {...(secret && { autoCapitalize: 'none', autoCorrect: false, spellCheck: false })}
          secureTextEntry={secret && !revealed}
          style={styles.input}
          placeholderTextColor={theme.colors.textMuted}
        />
        {secret ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Masquer la saisie' : 'Afficher la saisie'}
            hitSlop={theme.spacing(2)}
            onPress={() => setRevealed((value) => !value)}
            style={({ pressed }) => [styles.reveal, pressed && styles.revealPressed]}>
            <Ionicons
              name={revealed ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: theme.spacing(1.5) },
  fieldLabel: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
  inputFrame: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.sm,
  },
  input: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(3),
  },
  reveal: { justifyContent: 'center', paddingHorizontal: theme.spacing(3) },
  revealPressed: { opacity: 0.6 },
});
