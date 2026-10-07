import { useCallback, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

/** How close to the end still counts as reading the latest lines. */
const STICK_DISTANCE = 48;

/**
 * Keeps a log view on its newest lines, as a terminal does: on opening and as
 * lines arrive, until the user scrolls up to read; back at the bottom, it
 * sticks again. Read in event handlers only, hence a ref.
 */
export function useStickToBottom() {
  const stuck = useRef(true);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    stuck.current =
      contentSize.height - layoutMeasurement.height - contentOffset.y < STICK_DISTANCE;
  }, []);

  const follow = useCallback((scrollToEnd: () => void) => {
    if (stuck.current) scrollToEnd();
  }, []);

  /** A new range starts from its newest line again. */
  const reset = useCallback(() => {
    stuck.current = true;
  }, []);

  return { onScroll, follow, reset };
}
