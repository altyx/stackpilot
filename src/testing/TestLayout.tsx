import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { AuthProvider } from '../auth/AuthContext';
import { CurrentEndpointProvider } from '../navigation/CurrentEndpoint';
import { SettingsProvider } from '../settings/SettingsContext';
import { memory } from './secureStoreMock';

/**
 * Root layout for screen tests under `renderRouter`: the app's providers,
 * minus the navigator. Tests mock `expo-secure-store` with `secureStoreMock`
 * and seed a session with `seedSession` so `AuthProvider` restores it.
 */
export function createTestLayout(queryClient: QueryClient) {
  return function TestLayout() {
    return (
      <QueryClientProvider client={queryClient}>
        <SettingsProvider>
          <AuthProvider>
            <CurrentEndpointProvider>
              <Slot />
            </CurrentEndpointProvider>
          </AuthProvider>
        </SettingsProvider>
      </QueryClientProvider>
    );
  };
}

export function seedSession(): void {
  memory.set(
    'portainer.session',
    JSON.stringify({ baseUrl: 'https://portainer.lan', mode: 'apiKey', token: 'ptr_x' }),
  );
}
