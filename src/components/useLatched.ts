import { useEffect, useState } from 'react';

/** Keeps the last non-null value, so content stays displayed while closing. */
export function useLatched<T>(value: T | null): T | null {
  const [latched, setLatched] = useState<T | null>(value);
  useEffect(() => {
    if (value !== null) setLatched(value);
  }, [value]);
  return value ?? latched;
}
