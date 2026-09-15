import { Drawer, DrawerToggleButton } from 'expo-router/drawer';
import { AppDrawerContent } from '../../src/navigation/AppDrawerContent';
import { theme } from '../../src/theme';

/**
 * Écrans principaux, réunis sous le menu latéral. Les écrans de détail restent
 * dans la pile racine : ils s'empilent par-dessus le menu, avec un bouton retour.
 */
export default function DrawerLayout() {
  return (
    <Drawer
      // Le retour Android revient à l'écran précédent plutôt qu'au premier du menu.
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
      <Drawer.Screen name="endpoints/[endpointId]/images" options={{ title: 'Images' }} />
      <Drawer.Screen name="endpoints/[endpointId]/volumes" options={{ title: 'Volumes' }} />
      <Drawer.Screen name="endpoints/index" options={{ title: 'Environnements' }} />
      <Drawer.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Drawer.Screen name="legal/terms" options={{ title: 'CGU' }} />
      <Drawer.Screen name="legal/privacy" options={{ title: 'Confidentialité' }} />
    </Drawer>
  );
}
