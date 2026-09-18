import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { StackEnv } from '../api/types';
import { MASK, isSensitiveName } from '../lib/secrets';
import { theme } from '../theme';

/** One stack variable; a credential-looking one stays hidden until tapped. */
export function StackEnvRow({ variable }: { variable: StackEnv }) {
  const sensitive = isSensitiveName(variable.name);
  const [revealed, setRevealed] = useState(false);
  const hidden = sensitive && !revealed;
  return (
    <View style={styles.row}>
      <Text style={styles.name} numberOfLines={2}>
        {variable.name}
      </Text>
      <Text style={styles.value} numberOfLines={hidden ? 1 : 3} selectable={!hidden}>
        {hidden ? MASK : variable.value || '—'}
      </Text>
      {sensitive ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={revealed ? `Masquer ${variable.name}` : `Afficher ${variable.name}`}
          hitSlop={8}
          onPress={() => setRevealed((current) => !current)}
          style={({ pressed }) => pressed && styles.pressed}>
          <Ionicons
            name={revealed ? 'eye-off-outline' : 'eye-outline'}
            size={18}
            color={theme.colors.accent}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(3),
    paddingVertical: theme.spacing(2),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  name: { color: theme.colors.textMuted, fontSize: 13, flexShrink: 1 },
  value: { color: theme.colors.text, fontSize: 13, flex: 1, textAlign: 'right' },
  pressed: { opacity: 0.75 },
});
