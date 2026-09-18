import { useEffect, useState } from 'react';

/** Garde la dernière valeur non nulle, pour que le contenu reste affiché pendant la fermeture. */
export function useLatched<T>(value: T | null): T | null {
  const [latched, setLatched] = useState<T | null>(value);
  useEffect(() => {
    if (value !== null) setLatched(value);
  }, [value]);
  return value ?? latched;
}
