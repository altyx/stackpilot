import * as SecureStore from 'expo-secure-store';

const SETTINGS_KEY = 'app.settings';

/**
 * App preferences — unrelated to authentication, but `expo-secure-store` is
 * the only storage bundled: not worth adding a dependency for two values.
 */
export interface Settings {
  /** Container refresh interval in milliseconds; `null` = manual. */
  refreshIntervalMs: number | null;
}

export const DEFAULT_SETTINGS: Settings = { refreshIntervalMs: 15_000 };

/** The only intervals offered, and therefore the only ones accepted on re-read. */
export const REFRESH_INTERVALS: readonly { value: number | null; label: string }[] = [
  { value: 10_000, label: 'Toutes les 10 secondes' },
  { value: 15_000, label: 'Toutes les 15 secondes' },
  { value: 30_000, label: 'Toutes les 30 secondes' },
  { value: 60_000, label: 'Toutes les minutes' },
  { value: null, label: 'Manuel' },
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
    // the app with an interval no screen offers.
    const known = REFRESH_INTERVALS.some((option) => option.value === parsed.refreshIntervalMs);
    return known
      ? { refreshIntervalMs: parsed.refreshIntervalMs ?? null }
      : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}
