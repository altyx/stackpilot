import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Session } from '../api/types';
import { clearSession, loadSession, saveSession } from './storage';

interface AuthState {
  session: Session | null;
  /** true tant que la session persistée n'a pas été relue au démarrage. */
  isRestoring: boolean;
  signIn: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    loadSession()
      .then((restored) => {
        if (!cancelled) setSession(restored);
      })
      .finally(() => {
        if (!cancelled) setIsRestoring(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (next: Session) => {
    await saveSession(next);
    setSession(next);
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    setSession(null);
    // Sinon une reconnexion sur une autre instance afficherait brièvement les
    // conteneurs de la précédente, servis depuis le cache.
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthState>(
    () => ({ session, isRestoring, signIn, signOut }),
    [session, isRestoring, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé sous <AuthProvider>.');
  return ctx;
}
