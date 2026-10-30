import { Drawer, DrawerToggleButton } from 'expo-router/drawer';
import { useTranslation } from 'react-i18next';
import { AppDrawerContent } from '../../src/navigation/AppDrawerContent';
import { useTheme } from '../../src/theme';

/**
 * Main screens, grouped under the side drawer. Detail screens stay in the
 * root stack: they stack on top of the drawer, with a back button.
 */
export default function DrawerLayout() {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Drawer
      // Android back returns to the previous screen rather than the drawer's first one.
      backBehavior="history"
      drawerContent={(props) => <AppDrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { color: theme.colors.text },
        headerLeft: ({ tintColor }) => (
          <DrawerToggleButton tintColor={tintColor} accessibilityLabel={t('nav.openMenu')} />
        ),
        drawerStyle: { backgroundColor: theme.colors.surface },
        overlayColor: theme.colors.backdrop,
        sceneStyle: { backgroundColor: theme.colors.bg },
      }}>
      <Drawer.Screen
        name="endpoints/[endpointId]/overview"
        options={{ title: t('nav.overview') }}
      />
      <Drawer.Screen name="endpoints/[endpointId]/index" options={{ title: t('nav.containers') }} />
      <Drawer.Screen name="endpoints/[endpointId]/stacks" options={{ title: t('nav.stacks') }} />
      <Drawer.Screen name="endpoints/[endpointId]/images" options={{ title: t('nav.images') }} />
      <Drawer.Screen name="endpoints/[endpointId]/volumes" options={{ title: t('nav.volumes') }} />
      <Drawer.Screen name="endpoints/index" options={{ title: t('nav.environments') }} />
      <Drawer.Screen name="settings" options={{ title: t('nav.settings') }} />
    </Drawer>
  );
}
