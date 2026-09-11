import { createContext, useContext, type ReactNode } from 'react';

/**
 * `useLocalSearchParams` ne renvoie que les paramètres de la route courante.
 * Les écrans d'onglets sont enfants du navigateur `(tabs)` : le segment
 * `[endpointId]` appartient à leur route parente et ne descend pas jusqu'à eux.
 * Le layout, qui porte ce segment, le rediffuse donc explicitement.
 */
const EndpointIdContext = createContext<number | null>(null);

export function EndpointProvider({
  endpointId,
  children,
}: {
  endpointId: number;
  children: ReactNode;
}) {
  return <EndpointIdContext.Provider value={endpointId}>{children}</EndpointIdContext.Provider>;
}

export function useEndpointId(): number {
  const endpointId = useContext(EndpointIdContext);
  if (endpointId === null || !Number.isInteger(endpointId)) {
    throw new Error("useEndpointId doit être utilisé sous <EndpointProvider>, avec un identifiant valide.");
  }
  return endpointId;
}
