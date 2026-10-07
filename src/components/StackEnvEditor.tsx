import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { StackEnv } from '../api/types';
import { isSensitiveName } from '../lib/secrets';
import { emptyDraft, fromDrafts, toDrafts, validateEnv, type EnvDraft } from '../lib/stackEnv';
import { theme } from '../theme';
import { Button } from './Button';
import { IconButton } from './IconButton';

/**
 * Edits a stack's Portainer variables as name/value pairs. They live apart
 * from the compose file, so no YAML is rewritten. Values are kept verbatim,
 * and the keyboard is told not to "fix" them (capitals, smart quotes).
 */
export function StackEnvEditor({
  initial,
  busy,
  onCancel,
  onSave,
}: {
  initial: StackEnv[] | null;
  busy: boolean;
  onCancel: () => void;
  onSave: (env: StackEnv[]) => void;
}) {
  const [drafts, setDrafts] = useState<EnvDraft[]>(() => toDrafts(initial));
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const errors = validateEnv(drafts);

  function update(key: string, patch: Partial<EnvDraft>) {
    setDrafts((current) => current.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  function toggleReveal(key: string) {
    setRevealed((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function save() {
    // Errors show once a save is attempted: not while the first name is typed.
    setSubmitted(true);
    if (errors.size === 0) onSave(fromDrafts(drafts));
  }

  return (
    <View style={styles.editor}>
      {drafts.map((draft) => {
        const masked = isSensitiveName(draft.name) && !revealed.has(draft.key);
        const error = submitted ? errors.get(draft.key) : undefined;
        return (
          <View key={draft.key} style={styles.row}>
            <View style={styles.fields}>
              <TextInput
                value={draft.name}
                onChangeText={(name) => update(draft.key, { name })}
                placeholder="NOM"
                placeholderTextColor={theme.colors.textMuted}
                accessibilityLabel="Nom de la variable"
                autoCapitalize="characters"
                autoCorrect={false}
                spellCheck={false}
                style={[styles.input, styles.name, error ? styles.inputError : null]}
              />
              <View style={styles.valueRow}>
                <TextInput
                  value={draft.value}
                  onChangeText={(value) => update(draft.key, { value })}
                  placeholder="valeur"
                  placeholderTextColor={theme.colors.textMuted}
                  accessibilityLabel={`Valeur de ${draft.name || 'la variable'}`}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  smartInsertDelete={false}
                  secureTextEntry={masked}
                  multiline={!masked && draft.value.includes('\n')}
                  style={[styles.input, styles.value]}
                />
                {isSensitiveName(draft.name) ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={masked ? `Afficher ${draft.name}` : `Masquer ${draft.name}`}
                    hitSlop={8}
                    onPress={() => toggleReveal(draft.key)}>
                    <Ionicons
                      name={masked ? 'eye-outline' : 'eye-off-outline'}
                      size={18}
                      color={theme.colors.accent}
                    />
                  </Pressable>
                ) : null}
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </View>
            <IconButton
              icon="remove-circle-outline"
              variant="danger"
              accessibilityLabel={`Retirer ${draft.name || 'la variable'}`}
              onPress={() => setDrafts((current) => current.filter((d) => d.key !== draft.key))}
            />
          </View>
        );
      })}

      <Text
        accessibilityRole="button"
        onPress={() => setDrafts((current) => [...current, emptyDraft()])}
        style={styles.add}>
        + Ajouter une variable
      </Text>

      <View style={styles.actions}>
        <Button label="Annuler" variant="secondary" onPress={onCancel} style={styles.action} />
        <Button
          label="Enregistrer"
          onPress={save}
          loading={busy}
          disabled={submitted && errors.size > 0}
          style={styles.action}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { gap: theme.spacing(3) },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing(2) },
  fields: { flex: 1, gap: theme.spacing(1.5) },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2) },
  input: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.borderStrong,
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    color: theme.colors.text,
    fontSize: 14,
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(2),
  },
  inputError: { borderColor: theme.colors.danger },
  name: { fontWeight: '600' },
  value: { flex: 1 },
  error: { color: theme.colors.danger, fontSize: 12 },
  add: {
    alignSelf: 'flex-start',
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: theme.spacing(1),
  },
  actions: { flexDirection: 'row', gap: theme.spacing(2) },
  action: { flex: 1 },
});
