import { Alert, Linking, Pressable, ScrollView, Text } from 'react-native';
import { CHANGELOG } from '../src/changelog';
import { ReleaseCard } from '../src/components/ReleaseCard';
import { useTranslation } from 'react-i18next';
import { appVersion } from '../src/lib/appInfo';
import { RELEASES_URL } from '../src/lib/support';
import { createStyles } from '../src/theme';

/**
 * Release notes bundled in the app: they describe the installed version even
 * offline, with no call to GitHub.
 */
export default function ChangelogScreen() {
  const styles = useStyles();
  const { t } = useTranslation();
  return (
    <ScrollView contentContainerStyle={styles.content}>
      {CHANGELOG.map((release) => (
        <ReleaseCard
          key={release.version}
          release={release}
          installed={release.version === appVersion()}
        />
      ))}

      <Pressable
        accessibilityRole="link"
        onPress={() =>
          Linking.openURL(RELEASES_URL).catch(() =>
            Alert.alert(t('common.cannotOpenLink'), t('common.noAppForLink')),
          )
        }
        style={({ pressed }) => pressed && styles.pressed}>
        <Text style={styles.link}>{t('changelog.allReleases')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const useStyles = createStyles((theme) => ({
  content: { padding: theme.spacing(4), gap: theme.spacing(3), paddingBottom: theme.spacing(10) },
  link: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: theme.spacing(3),
  },
  pressed: { opacity: 0.75 },
}));
