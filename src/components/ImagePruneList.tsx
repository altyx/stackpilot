import { Text, View } from 'react-native';
import type { ImageSummary } from '../api/types';
import { useStrings } from '../i18n';
import { imageLabel } from '../lib/usage';
import { createStyles } from '../theme';

/** Beyond this, the image list is summarized to keep the sheet compact. */
const MAX_LISTED = 6;

export function ImagePruneList({ images }: { images: ImageSummary[] }) {
  const styles = useStyles();
  const t = useStrings();
  const listed = images.slice(0, MAX_LISTED);
  const hidden = images.length - listed.length;
  return (
    <View style={styles.images}>
      {listed.map((image) => (
        <View key={image.Id} style={styles.image}>
          <Text style={styles.name} numberOfLines={1}>
            {imageLabel(image)}
          </Text>
          <Text style={styles.size}>{t.bytes(image.Size)}</Text>
        </View>
      ))}
      {hidden > 0 ? <Text style={styles.more}>{t.common.andMore(hidden)}</Text> : null}
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  images: {
    backgroundColor: theme.colors.bg,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(3),
    gap: theme.spacing(2),
  },
  image: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2) },
  name: { color: theme.colors.text, fontSize: 14, flex: 1 },
  size: { color: theme.colors.textMuted, fontSize: 13 },
  more: { color: theme.colors.textMuted, fontSize: 13 },
}));
