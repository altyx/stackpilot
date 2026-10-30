import { StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/auth/AuthContext';
import { CurrentEndpointProvider } from '../src/navigation/CurrentEndpoint';
import { ThemeProvider } from '../src/components/ThemeProvider';
import { RootNavigator } from '../src/navigation/RootNavigator';
import { SettingsProvider } from '../src/settings/SettingsContext';

// Without this handler, an alert received while the app is open stays invisible.
Notifications.setNotificationHandler({
  handleNotification: () =>
    Promise.resolve({
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

export default function RootLayout() {
  return (
    // The side drawer opens by swipe: without this root, its gestures
    // stay inert.
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <SettingsProvider>
            <ThemeProvider>
              <AuthProvider>
                <CurrentEndpointProvider>
                  <RootNavigator />
                </CurrentEndpointProvider>
              </AuthProvider>
            </ThemeProvider>
          </SettingsProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Transparent: the root view behind it carries the theme's background.
const styles = StyleSheet.create({
  root: { flex: 1 },
});
