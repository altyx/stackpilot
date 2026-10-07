import type { ReactNode } from 'react';
import 'react-native-gesture-handler/jestSetup';

// Without a provider, `useSafeAreaInsets` throws: the stand-in below is the
// one the library documents, with zeroed insets.
jest.mock('react-native-safe-area-context', () => {
  const { createContext } = jest.requireActual<typeof import('react')>('react');
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  return {
    __esModule: true,
    // Read directly by the navigators' headers (screens rendered in a stack).
    SafeAreaInsetsContext: createContext(insets),
    SafeAreaFrameContext: createContext(frame),
    SafeAreaProvider: ({ children }: { children?: ReactNode }) => children,
    SafeAreaView: ({ children }: { children?: ReactNode }) => children,
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
    initialWindowMetrics: { insets, frame },
  };
});

// Icons load their font asynchronously; reporting it loaded up front keeps
// icon renders synchronous, without stray `act()` warnings.
jest.mock('expo-font', () => ({
  ...jest.requireActual<typeof import('expo-font')>('expo-font'),
  isLoaded: () => true,
}));
