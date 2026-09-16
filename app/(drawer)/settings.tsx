import type { ComponentProps } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { LATEST_RELEASE } from '../../src/changelog';
import { BuildInfo } from '../../src/components/BuildInfo';
import { Card } from '../../src/components/ui';
import { SOURCE_CODE_URL } from '../../src/legal/publisher';
import { newIssueUrl } from '../../src/lib/support';
import { useSettings } from '../../src/settings/SettingsContext';
import { REFRESH_INTERVALS } from '../../src/settings/storage';
import { theme } from '../../src/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Réglages de l'application — ceux de Portainer restent dans Portainer. */
export default function SettingsScreen() {
  const { settings, update } = useSettings();
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Section title="Rafraîchissement">
        <Text style={styles.hint}>
          La liste des conteneurs se met à jour seule. Un intervalle plus long ménage la batterie
          et le forfait de données ; en mode manuel, tirez la liste vers le bas pour la rafraîchir.
        </Text>
        <Card style={styles.card}>
          {REFRESH_INTERVALS.map((option, index) => (
            <ChoiceRow
              key={option.label}
              label={option.label}
              selected={settings.refreshIntervalMs === option.value}
              first={index === 0}
              onPress={() => update({ refreshIntervalMs: option.value })}
            />
          ))}
        </Card>
      </Section>

      <Section title="Notifications">
        <Card style={styles.card}>
          <NavRow
            icon="notifications-outline"
            label="Alertes de vos conteneurs"
            hint="Jeton à donner à votre service de surveillance"
            onPress={() => router.push('/notifications')}
          />
        </Card>
      </Section>

      <Section title="Aide">
        <Card style={styles.card}>
          <NavRow
            icon="bug-outline"
            label="Signaler un problème"
            hint="Ouvre GitHub, message pré-rempli avec la version et l'appareil — rien de votre instance"
            external
            first
            onPress={() => openLink(newIssueUrl())}
          />
          <NavRow
            icon="logo-github"
            label="Code source"
            external
            onPress={() => openLink(SOURCE_CODE_URL)}
          />
        </Card>
      </Section>

      <Section title="À propos">
        <Card style={styles.card}>
          <NavRow
            icon="sparkles-outline"
            label="Nouveautés"
            hint={`Version ${LATEST_RELEASE.version}`}
            first
            onPress={() => router.push('/changelog')}
          />
          <NavRow
            icon="document-text-outline"
            label="Conditions d'utilisation"
            onPress={() => router.push('/terms')}
          />
          <NavRow
            icon="shield-checkmark-outline"
            label="Politique de confidentialité"
            onPress={() => router.push('/privacy')}
          />
        </Card>
        <BuildInfo />
      </Section>
    </ScrollView>
  );
}

function openLink(url: string): void {
  Linking.openURL(url).catch(() =>
    Alert.alert('Lien inaccessible', "Aucune application ne peut ouvrir cette adresse."),
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </View>
  );
}

/**
 * Les lignes sont séparées par une bordure haute plutôt que par un séparateur
 * intercalé : `first` évite un trait juste sous le bord de la carte.
 */
function NavRow({
  icon,
  label,
  hint,
  external = false,
  first = false,
  onPress,
}: {
  icon: IconName;
  label: string;
  hint?: string;
  /** Sort de l'application : l'icône de droite le dit avant le tap. */
  external?: boolean;
  first?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={external ? 'link' : 'button'}
      onPress={onPress}
      style={({ pressed }) => [styles.row, !first && styles.rowDivided, pressed && styles.pressed]}>
      <Ionicons name={icon} size={20} color={theme.colors.accent} />
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <Ionicons
        name={external ? 'open-outline' : 'chevron-forward'}
        size={18}
        color={theme.colors.textMuted}
      />
    </Pressable>
  );
}

function ChoiceRow({
  label,
  selected,
  first,
  onPress,
}: {
  label: string;
  selected: boolean;
  first: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.row, !first && styles.rowDivided, pressed && styles.pressed]}>
      <Text style={[styles.rowLabel, styles.choiceLabel, selected && styles.choiceLabelSelected]}>
        {label}
      </Text>
      {selected ? (
        <Ionicons name="checkmark" size={20} color={theme.colors.accent} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: theme.spacing(4), gap: theme.spacing(6), paddingBottom: theme.spacing(8) },
  section: { gap: theme.spacing(2) },
  sectionTitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: theme.spacing(1),
  },
  hint: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 18, paddingHorizontal: theme.spacing(1) },
  // La carte porte les lignes bord à bord : leur marge intérieure suffit.
  card: { padding: 0, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(3),
    minHeight: theme.spacing(12),
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(3),
  },
  rowDivided: { borderTopColor: theme.colors.border, borderTopWidth: StyleSheet.hairlineWidth },
  rowText: { flex: 1, gap: theme.spacing(0.5) },
  rowLabel: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  rowHint: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17 },
  choiceLabel: { flex: 1, fontWeight: '500' },
  choiceLabelSelected: { color: theme.colors.accent, fontWeight: '600' },
  pressed: { opacity: 0.75 },
});
