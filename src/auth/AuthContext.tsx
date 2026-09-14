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
  /** true tant que la session persistée n'a pas été relue au démarrage. */
  isRestoring: boolean;
  /** Dernière connexion réussie, pour pré-remplir le formulaire. */
  lastLogin: LastLogin | null;
  /** true si la session a été fermée parce que Portainer a refusé son token. */
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
  // Lu par l'écouteur de 401, qui ne doit pas attendre un rendu pour voir la
  // session changer : plusieurs requêtes peuvent échouer dans la même rafale.
  const sessionRef = useRef<Session | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadSession(), loadLastLogin()])
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
      // Sinon une reconnexion sur une autre instance afficherait brièvement les
      // conteneurs de la précédente, servis depuis le cache.
      queryClient.clear();
    },
    [queryClient],
  );

  const signOut = useCallback(() => endSession(false), [endSession]);

  // Un token expiré ou révoqué ne redeviendra pas valide : on ferme la session
  // et la garde de navigation racine renvoie vers /login. La comparaison du
  // token écarte les 401 étrangers à la session courante — validation d'un
  // access token depuis l'écran de connexion, réponse tardive d'une session
  // déjà remplacée.
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
