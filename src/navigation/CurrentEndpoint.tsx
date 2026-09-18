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
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../auth/AuthContext';
import { loadLastEndpoint, saveLastEndpoint } from '../auth/storage';

interface CurrentEndpointState {
  /**
   * Environment for the screen last viewed on the connected instance: it's
   * the one the Containers, Images and Volumes drawer entries target.
   */
  endpointId: number | null;
  /** true until the last persisted environment has been re-read. */
  isRestoring: boolean;
  select: (endpointId: number) => void;
}

const CurrentEndpointContext = createContext<CurrentEndpointState | null>(null);

export function CurrentEndpointProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const baseUrl = session?.baseUrl ?? null;
  // The state remembers which instance it's valid for: after an instance
  // change, it's stale as of render, without waiting for the re-read.
  const [state, setState] = useState<{ baseUrl: string; endpointId: number | null } | null>(null);
  const saved = useRef<string | null>(null);

  useEffect(() => {
    if (!baseUrl) return;
    let cancelled = false;
    loadLastEndpoint()
      .catch(() => null)
      .then((stored) => {
        if (cancelled) return;
        // A screen opened via deep link may have chosen the environment while
        // this was reading: that recent choice wins over the persisted value.
        setState((previous) =>
          previous?.baseUrl === baseUrl
            ? previous
            : { baseUrl, endpointId: stored?.baseUrl === baseUrl ? stored.endpointId : null },
        );
      });
    return () => {
      cancelled = true;
    };
  }, [baseUrl]);

  const select = useCallback(
    (endpointId: number) => {
      if (!baseUrl) return;
      setState({ baseUrl, endpointId });
      // Every return to a screen re-selects it: we only write to the
      // keychain when the value changes.
      const key = `${baseUrl}#${endpointId}`;
      if (saved.current === key) return;
      saved.current = key;
      saveLastEndpoint({ baseUrl, endpointId }).catch(() => {
        saved.current = null;
      });
    },
    [baseUrl],
  );

  const isRestoring = baseUrl !== null && state?.baseUrl !== baseUrl;
  const endpointId = !isRestoring && state ? state.endpointId : null;

  const value = useMemo<CurrentEndpointState>(
    () => ({ endpointId, isRestoring, select }),
    [endpointId, isRestoring, select],
  );

  return <CurrentEndpointContext.Provider value={value}>{children}</CurrentEndpointContext.Provider>;
}

export function useCurrentEndpoint(): CurrentEndpointState {
  const ctx = useContext(CurrentEndpointContext);
  if (!ctx) throw new Error('useCurrentEndpoint doit être utilisé sous <CurrentEndpointProvider>.');
  return ctx;
}

/**
 * Environment id carried by the screen's route, kept as the current
 * environment every time the screen regains focus.
 *
 * Focus, not mount: the drawer's screens stay mounted. Returning to one
 * environment's containers after viewing another's must realign the drawer
 * with the screen shown.
 */
export function useEndpointParam(): number {
  const { endpointId } = useLocalSearchParams<{ endpointId: string }>();
  const id = Number(endpointId);
  const { select } = useCurrentEndpoint();

  useFocusEffect(
    useCallback(() => {
      if (Number.isInteger(id)) select(id);
    }, [id, select]),
  );

  if (!Number.isInteger(id)) {
    throw new Error(`Identifiant d'environnement invalide : « ${endpointId} ».`);
  }
  return id;
}
