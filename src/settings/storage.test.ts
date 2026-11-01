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

  it('restores known choices, including manual refresh', async () => {
    const choices = { refreshIntervalMs: 60_000, appearance: 'light', language: 'fr' } as const;
    memory.set('app.settings', JSON.stringify(choices));
    await expect(loadSettings()).resolves.toEqual(choices);
    const manual = { refreshIntervalMs: null, appearance: 'dark', language: 'en' } as const;
    memory.set('app.settings', JSON.stringify(manual));
    await expect(loadSettings()).resolves.toEqual(manual);
  });

  it('falls back to the default of each choice no screen offers', async () => {
    memory.set('app.settings', JSON.stringify({ refreshIntervalMs: 5_000, appearance: 'dark' }));
    await expect(loadSettings()).resolves.toEqual({ ...DEFAULT_SETTINGS, appearance: 'dark' });
    memory.set('app.settings', JSON.stringify({ refreshIntervalMs: 30_000, appearance: 'sepia' }));
    await expect(loadSettings()).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      refreshIntervalMs: 30_000,
    });
    memory.set('app.settings', JSON.stringify({ language: 'de' }));
    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it('keeps the interval saved before the appearance and language existed', async () => {
    memory.set('app.settings', JSON.stringify({ refreshIntervalMs: null }));
    await expect(loadSettings()).resolves.toEqual({
      refreshIntervalMs: null,
      appearance: 'system',
      language: 'en',
    });
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
    await saveSettings({ refreshIntervalMs: null, appearance: 'light', language: 'fr' });
    expect(memory.get('app.settings')).toBe(
      '{"refreshIntervalMs":null,"appearance":"light","language":"fr"}',
    );
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('app.settings', expect.any(String), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  });
});
