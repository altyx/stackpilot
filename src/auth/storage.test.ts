import * as SecureStore from 'expo-secure-store';
import type { Session } from '../api/types';
import { memory } from '../testing/secureStoreMock';
import {
  clearSession,
  loadLastEndpoint,
  loadLastLogin,
  loadSession,
  saveLastEndpoint,
  saveSession,
} from './storage';

jest.mock(
  'expo-secure-store',
  () =>
    jest.requireActual<typeof import('../testing/secureStoreMock')>('../testing/secureStoreMock')
      .secureStoreMock,
);

const session: Session = {
  baseUrl: 'https://portainer.lan',
  mode: 'jwt',
  token: 'secret-token',
  username: 'admin',
};

beforeEach(() => memory.clear());

describe('session', () => {
  it('round-trips through the keychain, restricted to this device', async () => {
    await saveSession(session);
    await expect(loadSession()).resolves.toEqual(session);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('portainer.session', expect.any(String), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  });

  it('is null when nothing, or something unreadable, is stored', async () => {
    await expect(loadSession()).resolves.toBeNull();
    memory.set('portainer.session', '{not json');
    await expect(loadSession()).resolves.toBeNull();
    memory.set('portainer.session', JSON.stringify({ baseUrl: 'x', mode: 'jwt' }));
    await expect(loadSession()).resolves.toBeNull();
  });
});

describe('last login', () => {
  it('remembers how to sign in again, never the token', async () => {
    await saveSession(session);
    await clearSession();
    await expect(loadSession()).resolves.toBeNull();
    await expect(loadLastLogin()).resolves.toEqual({
      baseUrl: 'https://portainer.lan',
      mode: 'jwt',
      username: 'admin',
    });
    expect(memory.get('portainer.lastLogin')).not.toContain('secret-token');
  });

  it('ignores an unknown auth mode', async () => {
    memory.set('portainer.lastLogin', JSON.stringify({ baseUrl: 'x', mode: 'magic' }));
    await expect(loadLastLogin()).resolves.toBeNull();
  });
});

describe('last endpoint', () => {
  it('round-trips and survives a sign-out', async () => {
    await saveLastEndpoint({ baseUrl: 'https://portainer.lan', endpointId: 3 });
    await clearSession();
    await expect(loadLastEndpoint()).resolves.toEqual({
      baseUrl: 'https://portainer.lan',
      endpointId: 3,
    });
  });

  it('rejects a malformed record', async () => {
    memory.set('portainer.lastEndpoint', JSON.stringify({ baseUrl: 'x', endpointId: '3' }));
    await expect(loadLastEndpoint()).resolves.toBeNull();
  });
});
