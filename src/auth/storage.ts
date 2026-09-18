import * as SecureStore from 'expo-secure-store';
import type { AuthMode, Session } from '../api/types';

const SESSION_KEY = 'portainer.session';
const LAST_LOGIN_KEY = 'portainer.lastLogin';
const LAST_ENDPOINT_KEY = 'portainer.lastEndpoint';

/** What's used to pre-fill the login form — never the token. */
export type LastLogin = Pick<Session, 'baseUrl' | 'mode' | 'username'>;

/**
 * The session holds an access token: it lives in the iOS Keychain / Android
 * Keystore, never in AsyncStorage.
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
  // Survives `clearSession`: it's precisely after signing out that it's useful.
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

/**
 * Last opened environment, tied to its instance: an environment id only
 * makes sense on the instance that assigned it.
 */
export interface LastEndpoint {
  baseUrl: string;
  endpointId: number;
}

export async function saveLastEndpoint(lastEndpoint: LastEndpoint): Promise<void> {
  // Survives `clearSession`, like `LAST_LOGIN_KEY`: signing back into the
  // same instance reopens the last environment viewed.
  await SecureStore.setItemAsync(LAST_ENDPOINT_KEY, JSON.stringify(lastEndpoint), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function loadLastEndpoint(): Promise<LastEndpoint | null> {
  const raw = await SecureStore.getItemAsync(LAST_ENDPOINT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LastEndpoint;
    return parsed.baseUrl && Number.isInteger(parsed.endpointId) ? parsed : null;
  } catch {
    return null;
  }
}
