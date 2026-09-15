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
   * Environnement de l'écran consulté en dernier sur l'instance connectée :
   * c'est lui que visent les entrées Conteneurs, Images et Volumes du menu.
   */
  endpointId: number | null;
  /** true tant que le dernier environnement persisté n'a pas été relu. */
  isRestoring: boolean;
  select: (endpointId: number) => void;
}

const CurrentEndpointContext = createContext<CurrentEndpointState | null>(null);

export function CurrentEndpointProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const baseUrl = session?.baseUrl ?? null;
  // L'état retient l'instance pour laquelle il vaut : après un changement
  // d'instance, il est caduc dès le rendu, sans attendre la relecture.
  const [state, setState] = useState<{ baseUrl: string; endpointId: number | null } | null>(null);
  const saved = useRef<string | null>(null);

  useEffect(() => {
    if (!baseUrl) return;
    let cancelled = false;
    loadLastEndpoint()
      .catch(() => null)
      .then((stored) => {
        if (cancelled) return;
        // Un écran ouvert par lien profond a pu choisir l'environnement pendant
        // la lecture : ce choix récent l'emporte sur la valeur persistée.
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
      // Chaque retour sur un écran le resélectionne : on n'écrit dans le
      // trousseau que si la valeur change.
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
 * Identifiant d'environnement porté par la route de l'écran, retenu comme
 * environnement courant à chaque fois que l'écran reprend le focus.
 *
 * Le focus, et non le montage : les écrans du menu restent montés. Revenir sur
 * les conteneurs d'un environnement après avoir consulté ceux d'un autre doit
 * réaligner le menu sur l'écran affiché.
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
