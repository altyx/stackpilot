import { StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/auth/AuthContext';
import { CurrentEndpointProvider } from '../src/navigation/CurrentEndpoint';
import { RootNavigator } from '../src/navigation/RootNavigator';
import { SettingsProvider } from '../src/settings/SettingsContext';
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

export default function RootLayout() {
  return (
    // Le menu latéral s'ouvre au glissement : sans cette racine, ses gestes
    // restent inertes.
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <SettingsProvider>
            <AuthProvider>
              <CurrentEndpointProvider>
                <StatusBar style="light" />
                <RootNavigator />
              </CurrentEndpointProvider>
            </AuthProvider>
          </SettingsProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
});
