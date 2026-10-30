import * as SecureStore from 'expo-secure-store';
import { LANGUAGES, type Language } from '../i18n';

const SETTINGS_KEY = 'app.settings';

/**
 * App preferences — unrelated to authentication, but `expo-secure-store` is
 * the only storage bundled: not worth adding a dependency for a few values.
 */
export interface Settings {
  /** Container refresh interval in milliseconds; `null` = manual. */
  refreshIntervalMs: number | null;
  /** Color scheme; `system` follows the device's. */
  appearance: Appearance;
  /** Language of the interface; English until the user picks another. */
  language: Language;
}

export type Appearance = 'system' | 'light' | 'dark';

export const DEFAULT_SETTINGS: Settings = {
  refreshIntervalMs: 15_000,
  appearance: 'system',
  language: 'en',
};

export const APPEARANCES: readonly Appearance[] = ['system', 'light', 'dark'];

/** The only intervals offered, and therefore the only ones accepted on re-read. */
export const REFRESH_INTERVALS: readonly (number | null)[] = [10_000, 15_000, 30_000, 60_000, null];

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
    const interval = REFRESH_INTERVALS.find((value) => value === parsed.refreshIntervalMs);
    const appearance = APPEARANCES.find((value) => value === parsed.appearance);
    const language = LANGUAGES.find((option) => option.value === parsed.language);
    return {
      refreshIntervalMs: interval !== undefined ? interval : DEFAULT_SETTINGS.refreshIntervalMs,
      appearance: appearance ?? DEFAULT_SETTINGS.appearance,
      language: language ? language.value : DEFAULT_SETTINGS.language,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
