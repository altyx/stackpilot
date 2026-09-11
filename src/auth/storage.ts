import * as SecureStore from 'expo-secure-store';
import type { Session } from '../api/types';

const SESSION_KEY = 'portainer.session';

/**
 * La session contient un jeton d'accès : elle vit dans le Keychain iOS /
 * Keystore Android, jamais dans AsyncStorage.
 */
export async function saveSession(session: Session): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function loadSession(): Promise<Session | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Session;
    return parsed.baseUrl && parsed.token && parsed.mode ? parsed : null;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
