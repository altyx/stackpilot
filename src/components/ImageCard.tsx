import { Text, View } from 'react-native';
import type { ImageSummary } from '../api/types';
import { useStrings } from '../i18n';
import { imageLabel, isDangling, shortImageId, type Usage } from '../lib/usage';
import { createStyles } from '../theme';
import { Card } from './Card';
import { IconButton } from './IconButton';
import { UsageBadge } from './UsageBadge';

export function ImageCard({
  usage,
  updateAvailable = false,
  onDelete,
}: {
  usage: Usage<ImageSummary>;
  /** Its registry has a newer version, per Portainer's indicator. */
  updateAvailable?: boolean;
  /** Offered on unused images only: Docker refuses to delete the others. */
  onDelete?: () => void;
}) {
  const styles = useStyles();
  const t = useStrings();
  const { item: image, usedBy } = usage;
  return (
    <Card style={styles.card}>
      <View style={styles.content}>
        <View style={styles.cardHeader}>
          <Text style={styles.name} numberOfLines={2}>
            {imageLabel(image)}
          </Text>
          <UsageBadge usedBy={usedBy} kind="image" />
        </View>

        <Text style={styles.meta}>
          {t.bytes(image.Size)} · {shortImageId(image.Id)} · {t.date(image.Created)}
        </Text>

        {updateAvailable ? <Text style={styles.update}>{t.images.newVersion}</Text> : null}

        {isDangling(image) ? <Text style={styles.dangling}>{t.images.dangling}</Text> : null}

        {usedBy.length > 0 ? (
          <Text style={styles.usedBy} numberOfLines={2}>
            {usedBy.join(', ')}
          </Text>
        ) : null}

        {(image.RepoTags ?? []).length > 1 ? (
          <Text style={styles.meta}>{t.images.tags(image.RepoTags!.length)}</Text>
        ) : null}
      </View>

      {onDelete ? (
        <IconButton
          icon="trash-outline"
          variant="danger"
          accessibilityLabel={t.common.deleteNamed(imageLabel(image))}
          onPress={onDelete}
        />
      ) : null}
    </Card>
  );
}

const useStyles = createStyles((theme) => ({
  card: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(3) },
  content: { flex: 1, gap: theme.spacing(1) },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing(2) },
  name: { color: theme.colors.text, fontSize: 14, fontWeight: '600', flex: 1 },
  meta: { color: theme.colors.textMuted, fontSize: 12 },
  dangling: { color: theme.colors.warning, fontSize: 12 },
  update: { color: theme.colors.accent, fontSize: 12, fontWeight: '500' },
  usedBy: { color: theme.colors.text, fontSize: 12 },
}));
