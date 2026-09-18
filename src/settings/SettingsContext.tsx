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
  // Default values apply while the stored ones are re-read: a display
  // preference doesn't justify delaying the first screen.
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const current = useRef(settings);
  const changed = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadSettings().then((stored) => {
      // A setting changed while re-reading is more recent than the re-read.
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
      // The setting stays applied for this session: nothing to tell the
      // user, who can't do anything about it anyway.
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
