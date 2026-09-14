import * as SecureStore from 'expo-secure-store';
import type { AuthMode, Session } from '../api/types';

const SESSION_KEY = 'portainer.session';
const LAST_LOGIN_KEY = 'portainer.lastLogin';

/** Ce qui sert à pré-remplir le formulaire de connexion — jamais le token. */
export type LastLogin = Pick<Session, 'baseUrl' | 'mode' | 'username'>;

/**
 * La session contient un jeton d'accès : elle vit dans le Keychain iOS /
 * Keystore Android, jamais dans AsyncStorage.
 */
export async function saveSession(session: Session): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  const lastLogin: LastLogin = {
    baseUrl: session.baseUrl,
    mode: session.mode,
    username: session.username,
  };
  // Survit à `clearSession` : c'est précisément après une déconnexion qu'il sert.
  await SecureStore.setItemAsync(LAST_LOGIN_KEY, JSON.stringify(lastLogin), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function loadLastLogin(): Promise<LastLogin | null> {
  const raw = await SecureStore.getItemAsync(LAST_LOGIN_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LastLogin;
    return parsed.baseUrl && isAuthMode(parsed.mode) ? parsed : null;
  } catch {
    return null;
  }
}

function isAuthMode(value: unknown): value is AuthMode {
  return value === 'apiKey' || value === 'jwt';
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
