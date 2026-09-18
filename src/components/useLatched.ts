import { useState } from 'react';

/** Keeps the last non-null value, so content stays displayed while closing. */
export function useLatched<T>(value: T | null): T | null {
  const [latched, setLatched] = useState<T | null>(value);
  // Adjusted during render rather than in an effect: the caller gets the new
  // value on the same pass, with no extra render carrying the stale one.
  if (value !== null && value !== latched) setLatched(value);
  return value ?? latched;
}
