import { Alert, Linking, ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { LATEST_RELEASE } from '../../src/changelog';
import { BuildInfo } from '../../src/components/BuildInfo';
import { Card } from '../../src/components/Card';
import { SettingsChoiceRow } from '../../src/components/SettingsChoiceRow';
import { SettingsNavRow } from '../../src/components/SettingsNavRow';
import { SettingsSection } from '../../src/components/SettingsSection';
import { SOURCE_CODE_URL } from '../../src/legal/publisher';
import { newIssueUrl } from '../../src/lib/support';
import { useSettings } from '../../src/settings/SettingsContext';
import { REFRESH_INTERVALS } from '../../src/settings/storage';
import { theme } from '../../src/theme';

/** Réglages de l'application — ceux de Portainer restent dans Portainer. */
export default function SettingsScreen() {
  const { settings, update } = useSettings();
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SettingsSection title="Rafraîchissement">
        <Text style={styles.hint}>
          La liste des conteneurs se met à jour seule. Un intervalle plus long ménage la batterie
          et le forfait de données ; en mode manuel, tirez la liste vers le bas pour la rafraîchir.
        </Text>
        <Card style={styles.card}>
          {REFRESH_INTERVALS.map((option, index) => (
            <SettingsChoiceRow
              key={option.label}
              label={option.label}
              selected={settings.refreshIntervalMs === option.value}
              first={index === 0}
              onPress={() => update({ refreshIntervalMs: option.value })}
            />
          ))}
        </Card>
      </SettingsSection>

      <SettingsSection title="Notifications">
        <Card style={styles.card}>
          <SettingsNavRow
            icon="notifications-outline"
            label="Alertes de vos conteneurs"
            hint="Jeton à donner à votre service de surveillance"
            onPress={() => router.push('/notifications')}
          />
        </Card>
      </SettingsSection>

      <SettingsSection title="Aide">
        <Card style={styles.card}>
          <SettingsNavRow
            icon="bug-outline"
            label="Signaler un problème"
            hint="Ouvre GitHub, message pré-rempli avec la version et l'appareil — rien de votre instance"
            external
            first
            onPress={() => openLink(newIssueUrl())}
          />
          <SettingsNavRow
            icon="logo-github"
            label="Code source"
            external
            onPress={() => openLink(SOURCE_CODE_URL)}
          />
        </Card>
      </SettingsSection>

      <SettingsSection title="À propos">
        <Card style={styles.card}>
          <SettingsNavRow
            icon="sparkles-outline"
            label="Nouveautés"
            hint={`Version ${LATEST_RELEASE.version}`}
            first
            onPress={() => router.push('/changelog')}
          />
          <SettingsNavRow
            icon="document-text-outline"
            label="Conditions d'utilisation"
            onPress={() => router.push('/terms')}
          />
          <SettingsNavRow
            icon="shield-checkmark-outline"
            label="Politique de confidentialité"
            onPress={() => router.push('/privacy')}
          />
        </Card>
        <BuildInfo />
      </SettingsSection>
    </ScrollView>
  );
}

function openLink(url: string): void {
  Linking.openURL(url).catch(() =>
    Alert.alert('Lien inaccessible', "Aucune application ne peut ouvrir cette adresse."),
  );
}

const styles = StyleSheet.create({
  content: { padding: theme.spacing(4), gap: theme.spacing(6), paddingBottom: theme.spacing(8) },
  hint: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 18, paddingHorizontal: theme.spacing(1) },
  // La carte porte les lignes bord à bord : leur marge intérieure suffit.
  card: { padding: 0, overflow: 'hidden' },
});
