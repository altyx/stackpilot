import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/auth/AuthContext';
import { Loader } from '../src/components/ui';
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

function RootNavigator() {
  const { session, isRestoring } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  usePushNavigation(!!session);

  useEffect(() => {
    if (isRestoring) return;
    const onLoginScreen = segments[0] === 'login';
    if (!session && !onLoginScreen) router.replace('/login');
    else if (session && onLoginScreen) router.replace('/endpoints');
  }, [session, isRestoring, segments, router]);

  if (isRestoring) return <Loader label="Restauration de la session…" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { color: theme.colors.text },
        contentStyle: { backgroundColor: theme.colors.bg },
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ title: '' }} />
      <Stack.Screen name="notifications" options={{ title: '' }} />
      <Stack.Screen name="endpoints/index" options={{ title: '' }} />
      <Stack.Screen name="endpoints/[endpointId]/(tabs)" options={{ title: '' }} />
      <Stack.Screen
        name="endpoints/[endpointId]/containers/[containerId]"
        options={{ title: '' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
