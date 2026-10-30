import { useEffect, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useSettings } from '../settings/SettingsContext';
import { ThemeContext, themeFor } from '../theme';

/** Applies the appearance chosen in the settings, or the device's. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { appearance } = useSettings().settings;
  const device = useColorScheme();
  // An unknown device scheme keeps the dark look the app always had.
  const scheme = appearance === 'system' ? (device === 'light' ? 'light' : 'dark') : appearance;
  const theme = themeFor(scheme);

  // The root view shows behind screen transitions and the keyboard, and
  // while the session is restored, before any screen draws its own.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.colors.bg).catch(() => {
      // Only the edges of a transition stay off-palette.
    });
  }, [theme]);

  return (
    <ThemeContext.Provider value={theme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
}
