import * as SecureStore from 'expo-secure-store';
import { memory } from '../testing/secureStoreMock';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './storage';

jest.mock(
  'expo-secure-store',
  () =>
    jest.requireActual<typeof import('../testing/secureStoreMock')>('../testing/secureStoreMock')
      .secureStoreMock,
);

beforeEach(() => memory.clear());

describe('loadSettings', () => {
  it('starts from the defaults', async () => {
    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it('restores a known interval, including manual refresh', async () => {
    memory.set('app.settings', JSON.stringify({ refreshIntervalMs: 60_000 }));
    await expect(loadSettings()).resolves.toEqual({ refreshIntervalMs: 60_000 });
    memory.set('app.settings', JSON.stringify({ refreshIntervalMs: null }));
    await expect(loadSettings()).resolves.toEqual({ refreshIntervalMs: null });
  });

  it('falls back to the defaults for an interval no screen offers', async () => {
    memory.set('app.settings', JSON.stringify({ refreshIntervalMs: 5_000 }));
    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it('falls back to the defaults when the store is unreadable', async () => {
    memory.set('app.settings', '{');
    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
    jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error('locked'));
    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });
});

describe('saveSettings', () => {
  it('writes JSON, restricted to this device', async () => {
    await saveSettings({ refreshIntervalMs: null });
    expect(memory.get('app.settings')).toBe('{"refreshIntervalMs":null}');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('app.settings', expect.any(String), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  });
});
