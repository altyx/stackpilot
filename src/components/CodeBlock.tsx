import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { IconButton } from './IconButton';

/**
 * Command or config the user retypes on another machine. Copying beats
 * retyping a Caddyfile from a phone, and the check mark confirms it without
 * an alert to dismiss.
 */
export function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await Clipboard.setStringAsync(code);
    setCopied(true);
  }

  return (
    <View style={styles.block}>
      <Text selectable style={styles.code}>
        {code}
      </Text>
      <IconButton
        icon={copied ? 'checkmark' : 'copy-outline'}
        accessibilityLabel={copied ? 'Copié' : 'Copier'}
        onPress={() => void copy()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing(2),
    backgroundColor: theme.colors.bg,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    padding: theme.spacing(2),
    paddingLeft: theme.spacing(3),
  },
  code: {
    flex: 1,
    color: theme.colors.text,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: 12,
    lineHeight: 18,
    paddingVertical: theme.spacing(1.5),
  },
});
