import * as SecureStore from 'expo-secure-store';

const SETTINGS_KEY = 'app.settings';

/**
 * App preferences — unrelated to authentication, but `expo-secure-store` is
 * the only storage bundled: not worth adding a dependency for two values.
 */
export interface Settings {
  /** Container refresh interval in milliseconds; `null` = manual. */
  refreshIntervalMs: number | null;
  /** Color scheme; `system` follows the device's. */
  appearance: Appearance;
}

export type Appearance = 'system' | 'light' | 'dark';

export const DEFAULT_SETTINGS: Settings = { refreshIntervalMs: 15_000, appearance: 'system' };

export const APPEARANCES: readonly { value: Appearance; label: string }[] = [
  { value: 'system', label: 'Same as device' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/** The only intervals offered, and therefore the only ones accepted on re-read. */
export const REFRESH_INTERVALS: readonly { value: number | null; label: string }[] = [
  { value: 10_000, label: 'Every 10 seconds' },
  { value: 15_000, label: 'Every 15 seconds' },
  { value: 30_000, label: 'Every 30 seconds' },
  { value: 60_000, label: 'Every minute' },
  { value: null, label: 'Manual' },
];

export async function saveSettings(settings: Settings): Promise<void> {
  await SecureStore.setItemAsync(SETTINGS_KEY, JSON.stringify(settings), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function loadSettings(): Promise<Settings> {
  const raw = await SecureStore.getItemAsync(SETTINGS_KEY).catch(() => null);
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(raw) as Partial<Settings>;
    // A value written by a past version, or since removed, must not leave
    // the app with a choice no screen offers. Each one falls back on its
    // own: settings saved before a preference existed keep the others.
    const interval = REFRESH_INTERVALS.find((option) => option.value === parsed.refreshIntervalMs);
    const appearance = APPEARANCES.find((option) => option.value === parsed.appearance);
    return {
      refreshIntervalMs: interval ? interval.value : DEFAULT_SETTINGS.refreshIntervalMs,
      appearance: appearance ? appearance.value : DEFAULT_SETTINGS.appearance,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
