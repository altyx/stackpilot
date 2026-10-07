import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { theme } from '../theme';

/**
 * Key count of the overview, opening the screen that details it. Every tile
 * keeps the same three lines, captions held to one, so the grid stays even.
 *
 * Navigates with the router rather than `Link asChild`, which drops a
 * `Pressable` function style: the tile would lose its whole frame.
 */
export function StatTile({
  label,
  value,
  caption,
  alert = false,
  href,
}: {
  label: string;
  value: string;
  caption: string;
  /** Draws the eye to the caption when something needs attention. */
  alert?: boolean;
  href: Href;
}) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${label}, ${value} ${caption}`}
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.caption, alert && styles.captionAlert]} numberOfLines={1}>
        {caption}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: theme.spacing(0.5),
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing(4),
  },
  pressed: { opacity: 0.75 },
  label: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '500' },
  value: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    marginTop: theme.spacing(1),
  },
  caption: { color: theme.colors.textMuted, fontSize: 12 },
  captionAlert: { color: theme.colors.warning, fontWeight: '500' },
});
