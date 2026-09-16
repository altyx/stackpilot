import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/auth/AuthContext';
import { Loader } from '../src/components/ui';
import { CurrentEndpointProvider } from '../src/navigation/CurrentEndpoint';
import { usePushNavigation } from '../src/notifications/usePushNavigation';
import { theme } from '../src/theme';

// Sans ce gestionnaire, une alerte reçue app ouverte reste invisible.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10_000,
      refetchOnWindowFocus: false,
    },
  },
});

// Écrans lisibles sans session : la connexion, et les textes légaux qu'elle lie.
const PUBLIC_SCREENS: ReadonlySet<string> = new Set(['login', 'terms', 'privacy']);

function RootNavigator() {
  const { session, isRestoring } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  usePushNavigation(!!session);

  useEffect(() => {
    if (isRestoring) return;
    const onLoginScreen = segments[0] === 'login';
    if (!session && !PUBLIC_SCREENS.has(segments[0] ?? '')) router.replace('/login');
    else if (session && onLoginScreen) router.replace('/');
  }, [session, isRestoring, segments, router]);

  if (isRestoring) return <Loader label="Restauration de la session…" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { color: theme.colors.text },
        contentStyle: { backgroundColor: theme.colors.bg },
        // Sans quoi iOS affiche le titre de l'écran précédent, « (drawer) » compris.
        headerBackButtonDisplayMode: 'minimal',
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ title: '' }} />
      <Stack.Screen name="terms" options={{ title: '' }} />
      <Stack.Screen name="privacy" options={{ title: '' }} />
      {/* Le menu porte ses propres en-têtes, avec le bouton qui l'ouvre. */}
      <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
      <Stack.Screen
        name="endpoints/[endpointId]/containers/[containerId]"
        options={{ title: '' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    // Le menu latéral s'ouvre au glissement : sans cette racine, ses gestes
    // restent inertes.
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <CurrentEndpointProvider>
              <StatusBar style="light" />
              <RootNavigator />
            </CurrentEndpointProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
});
