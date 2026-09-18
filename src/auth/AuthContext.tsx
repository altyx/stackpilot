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
import { useQueryClient } from '@tanstack/react-query';
import { setUnauthorizedListener } from '../api/client';
import type { Session } from '../api/types';
import { clearSession, loadLastLogin, loadSession, saveSession, type LastLogin } from './storage';

interface AuthState {
  session: Session | null;
  /** true until the persisted session has been re-read at startup. */
  isRestoring: boolean;
  /** Last successful login, to pre-fill the form. */
  lastLogin: LastLogin | null;
  /** true if the session was closed because Portainer rejected its token. */
  sessionExpired: boolean;
  signIn: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [lastLogin, setLastLogin] = useState<LastLogin | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  // Read by the 401 listener, which must not wait for a render to see the
  // session change: several requests can fail in the same burst.
  const sessionRef = useRef<Session | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    void Promise.all([loadSession(), loadLastLogin()])
      .then(([restored, last]) => {
        if (cancelled) return;
        sessionRef.current = restored;
        setSession(restored);
        setLastLogin(last);
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
    sessionRef.current = next;
    setSession(next);
    setLastLogin({ baseUrl: next.baseUrl, mode: next.mode, username: next.username });
    setSessionExpired(false);
  }, []);

  const endSession = useCallback(
    async (expired: boolean) => {
      sessionRef.current = null;
      setSessionExpired(expired);
      await clearSession();
      setSession(null);
      // Otherwise, signing in again on a different instance would briefly show
      // the previous one's containers, served from cache.
      queryClient.clear();
    },
    [queryClient],
  );

  const signOut = useCallback(() => endSession(false), [endSession]);

  // An expired or revoked token won't become valid again: we close the
  // session and the root navigation guard redirects to /login. Comparing the
  // token filters out 401s unrelated to the current session — validating an
  // access token from the login screen, a late response from a session
  // already replaced.
  useEffect(
    () =>
      setUnauthorizedListener((token) => {
        if (sessionRef.current?.token === token) void endSession(true);
      }),
    [endSession],
  );

  const value = useMemo<AuthState>(
    () => ({ session, isRestoring, lastLogin, sessionExpired, signIn, signOut }),
    [session, isRestoring, lastLogin, sessionExpired, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé sous <AuthProvider>.');
  return ctx;
}
