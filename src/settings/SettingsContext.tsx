import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from './storage';

interface SettingsState {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsState | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  // Les valeurs par défaut s'appliquent le temps de la relecture : un réglage
  // d'affichage ne justifie pas de retarder le premier écran.
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const current = useRef(settings);
  const changed = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadSettings().then((stored) => {
      // Un réglage modifié pendant la relecture est plus récent qu'elle.
      if (cancelled || changed.current) return;
      current.current = stored;
      setSettings(stored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    changed.current = true;
    const next = { ...current.current, ...patch };
    current.current = next;
    setSettings(next);
    saveSettings(next).catch(() => {
      // Le réglage reste appliqué pour cette session : rien à dire à
      // l'utilisateur, qui n'y peut rien.
    });
  }, []);

  const value = useMemo<SettingsState>(() => ({ settings, update }), [settings, update]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsState {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings doit être utilisé sous <SettingsProvider>.');
  return ctx;
}
