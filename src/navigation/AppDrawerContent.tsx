import type { ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { usePathname, useRouter, type Href } from 'expo-router';
import type { DrawerContentComponentProps } from 'expo-router/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEndpoints } from '../api/hooks';
import { useAuth } from '../auth/AuthContext';
import { BuildInfo } from '../components/BuildInfo';
import { theme } from '../theme';
import { useCurrentEndpoint } from './CurrentEndpoint';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Menu latéral : la navigation principale de l'application. */
export function AppDrawerContent({ navigation }: DrawerContentComponentProps) {
  const { session, signOut } = useAuth();
  const { endpointId } = useCurrentEndpoint();
  const { data: endpoints } = useEndpoints();
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const endpointName = endpoints?.find((endpoint) => endpoint.Id === endpointId)?.Name;
  const endpointBase = endpointId === null ? null : `/endpoints/${endpointId}`;

  function go(href: Href) {
    router.navigate(href);
    navigation.closeDrawer();
  }

  function item(label: string, icon: IconName, path: string | null) {
    return (
      <DrawerLink
        label={label}
        icon={icon}
        active={path !== null && pathname === path}
        onPress={path === null ? undefined : () => go(path as Href)}
      />
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.brand}>
        <Text style={styles.brandName}>StackPilot</Text>
        {session ? (
          <Text style={styles.instance} numberOfLines={1}>
            {session.baseUrl}
          </Text>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.items} alwaysBounceVertical={false}>
        {item('Environnements', 'server-outline', '/endpoints')}

        <Text style={styles.caption} numberOfLines={1}>
          {endpointBase === null ? 'Aucun environnement ouvert' : (endpointName ?? 'Environnement')}
        </Text>
        {item('Conteneurs', 'cube-outline', endpointBase)}
        {item('Images', 'layers-outline', endpointBase && `${endpointBase}/images`)}
        {item('Volumes', 'save-outline', endpointBase && `${endpointBase}/volumes`)}

        <View style={styles.separator} />
        {item('Réglages', 'settings-outline', '/settings')}
      </ScrollView>

      <View style={styles.footer}>
        <DrawerLink
          label="Déconnexion"
          icon="log-out-outline"
          tone="danger"
          onPress={() => {
            void signOut().then(() => router.replace('/login'));
          }}
        />
        <BuildInfo />
      </View>
    </View>
  );
}

function DrawerLink({
  label,
  icon,
  active = false,
  tone = 'default',
  onPress,
}: {
  label: string;
  icon: IconName;
  active?: boolean;
  tone?: 'default' | 'danger';
  /** Absent quand la destination n'existe pas encore : l'entrée est désactivée. */
  onPress?: () => void;
}) {
  const disabled = !onPress;
  const color =
    tone === 'danger' ? theme.colors.danger : active ? theme.colors.accent : theme.colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.link,
        active && styles.linkActive,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.linkLabel, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surface },
  brand: {
    paddingHorizontal: theme.spacing(5),
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
    borderBottomColor: theme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: theme.spacing(1),
  },
  brandName: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
  instance: { color: theme.colors.textMuted, fontSize: 12 },
  items: { padding: theme.spacing(3), gap: theme.spacing(1) },
  caption: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: theme.spacing(3),
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(1),
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing(2),
    marginHorizontal: theme.spacing(3),
  },
  // 48 pt minimum : la cible tactile recommandée sur Android comme sur iOS.
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(4),
    minHeight: theme.spacing(12),
    paddingHorizontal: theme.spacing(3),
    borderRadius: theme.radius.md,
  },
  linkActive: { backgroundColor: theme.colors.surfaceAlt },
  linkLabel: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.4 },
  footer: {
    paddingHorizontal: theme.spacing(3),
    paddingTop: theme.spacing(2),
    borderTopColor: theme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
