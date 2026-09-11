import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { EndpointProvider } from '../../../../src/api/EndpointContext';
import { useEndpoints } from '../../../../src/api/hooks';
import { theme } from '../../../../src/theme';

/** Les trois ressources d'un environnement Docker, sous un même en-tête. */
export default function EndpointTabsLayout() {
  const { endpointId } = useLocalSearchParams<{ endpointId: string }>();
  const id = Number(endpointId);
  const { data } = useEndpoints();
  // Déjà en cache après la liste des environnements ; le repli couvre l'ouverture
  // directe par lien profond, avant que la requête n'ait abouti.
  const name = data?.find((endpoint) => endpoint.Id === id)?.Name;

  return (
    <EndpointProvider endpointId={id}>
      <Stack.Screen options={{ title: '' }} />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.colors.accent,
          tabBarInactiveTintColor: theme.colors.textMuted,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
          },
          sceneStyle: { backgroundColor: theme.colors.bg },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Conteneurs',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cube-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="images"
          options={{
            title: 'Images',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="layers-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="volumes"
          options={{
            title: 'Volumes',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="save-outline" color={color} size={size} />
            ),
          }}
        />
      </Tabs>
    </EndpointProvider>
  );
}
