import { Text, View } from 'react-native';
import type { VolumeSummary } from '../api/types';
import { useTranslation } from 'react-i18next';
import { createStyles } from '../theme';
import { useFormat } from '../i18n/format';

/** Beyond this, the list is summarized to keep the sheet compact. */
const MAX_LISTED = 6;

export function VolumePruneList({
  volumes,
  sizes,
}: {
  volumes: VolumeSummary[];
  sizes: Map<string, number>;
}) {
  const styles = useStyles();
  const { t } = useTranslation();
  const f = useFormat();
  const listed = volumes.slice(0, MAX_LISTED);
  const hidden = volumes.length - listed.length;
  return (
    <View style={styles.volumes}>
      {listed.map((volume) => {
        const size = sizes.get(volume.Name);
        return (
          <View key={volume.Name} style={styles.volume}>
            <Text style={styles.name} numberOfLines={1} ellipsizeMode="middle">
              {volume.Name}
            </Text>
            {size !== undefined ? <Text style={styles.size}>{f.bytes(size)}</Text> : null}
          </View>
        );
      })}
      {hidden > 0 ? (
        <Text style={styles.more}>{t('common.andMore', { count: hidden })}</Text>
      ) : null}
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  volumes: {
    backgroundColor: theme.colors.bg,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(3),
    gap: theme.spacing(2),
  },
  volume: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2) },
  name: { color: theme.colors.text, fontSize: 14, flex: 1 },
  size: { color: theme.colors.textMuted, fontSize: 13 },
  more: { color: theme.colors.textMuted, fontSize: 13 },
}));
