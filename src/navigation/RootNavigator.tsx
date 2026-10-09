import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuth } from '../auth/AuthContext';
import { Loader } from '../components/Loader';
import { usePushNavigation } from '../notifications/usePushNavigation';
import { theme } from '../theme';

// Screens readable without a session: login, and the legal texts and
// certificate help it links to.
const PUBLIC_SCREENS: ReadonlySet<string> = new Set(['login', 'terms', 'privacy', 'certificates']);

export function RootNavigator() {
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

  if (isRestoring) return <Loader label="Restoring session…" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { color: theme.colors.text },
        contentStyle: { backgroundColor: theme.colors.bg },
        // Without this, iOS shows the previous screen's title, "(drawer)" included.
        headerBackButtonDisplayMode: 'minimal',
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ title: '' }} />
      {/* The legal texts serve the login screen as well as the settings. */}
      <Stack.Screen name="terms" options={{ title: '' }} />
      <Stack.Screen name="privacy" options={{ title: '' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="changelog" options={{ title: "What's new" }} />
      <Stack.Screen name="certificates" options={{ title: 'HTTPS certificate' }} />
      {/* The drawer screens carry their own headers, with the button that opens it. */}
      <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
      <Stack.Screen
        name="endpoints/[endpointId]/containers/[containerId]"
        options={{ title: '' }}
      />
      {/* Title set by the screen itself, from the stack name. */}
      <Stack.Screen name="endpoints/[endpointId]/stacks/[stackName]" options={{ title: '' }} />
    </Stack>
  );
}
