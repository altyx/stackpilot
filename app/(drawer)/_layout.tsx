import { Drawer, DrawerToggleButton } from 'expo-router/drawer';
import { AppDrawerContent } from '../../src/navigation/AppDrawerContent';
import { theme } from '../../src/theme';

/**
 * Main screens, grouped under the side drawer. Detail screens stay in the
 * root stack: they stack on top of the drawer, with a back button.
 */
export default function DrawerLayout() {
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
          <DrawerToggleButton tintColor={tintColor} accessibilityLabel="Ouvrir le menu" />
        ),
        drawerStyle: { backgroundColor: theme.colors.surface },
        overlayColor: theme.colors.backdrop,
        sceneStyle: { backgroundColor: theme.colors.bg },
      }}>
      <Drawer.Screen name="endpoints/[endpointId]/index" options={{ title: 'Conteneurs' }} />
      <Drawer.Screen name="endpoints/[endpointId]/stacks" options={{ title: 'Stacks' }} />
      <Drawer.Screen name="endpoints/[endpointId]/images" options={{ title: 'Images' }} />
      <Drawer.Screen name="endpoints/[endpointId]/volumes" options={{ title: 'Volumes' }} />
      <Drawer.Screen name="endpoints/index" options={{ title: 'Environnements' }} />
      <Drawer.Screen name="settings" options={{ title: 'Réglages' }} />
    </Drawer>
  );
}
