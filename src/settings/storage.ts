import * as SecureStore from 'expo-secure-store';

const SETTINGS_KEY = 'app.settings';

/**
 * Préférences de l'application — rien à voir avec l'authentification, mais
 * `expo-secure-store` est le seul stockage embarqué : inutile d'ajouter une
 * dépendance pour deux valeurs.
 */
export interface Settings {
  /** Intervalle de rafraîchissement des conteneurs en millisecondes ; `null` = manuel. */
  refreshIntervalMs: number | null;
}

export const DEFAULT_SETTINGS: Settings = { refreshIntervalMs: 15_000 };

/** Les seuls intervalles proposés, et donc les seuls acceptés à la relecture. */
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
    // Une valeur écrite par une version passée, ou retirée depuis, ne doit pas
    // laisser l'application avec un intervalle qu'aucun écran ne propose.
    const known = REFRESH_INTERVALS.some((option) => option.value === parsed.refreshIntervalMs);
    return known
      ? { refreshIntervalMs: parsed.refreshIntervalMs ?? null }
      : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}
