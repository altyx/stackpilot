import { createContext, useContext } from 'react';
import { StyleSheet } from 'react-native';

export type ColorScheme = 'light' | 'dark';

export interface ThemeColors {
  bg: string;
  surface: string;
  surfaceAlt: string;
  /** Card outlines and dividers: decorative, just enough to separate. */
  border: string;
  /** Outline of interactive controls (fields), held to 3:1. */
  borderStrong: string;
  text: string;
  textMuted: string;
  accent: string;
  /** Background of filled accent controls, dark enough for white text. */
  accentFill: string;
  accentDim: string;
  /** Tint behind a control that is switched on. */
  accentSubtle: string;
  /** Text on a filled accent or destructive control, whatever the scheme. */
  onFill: string;
  success: string;
  warning: string;
  danger: string;
  /** Background of filled destructive controls, dark enough for white text. */
  dangerFill: string;
  /** Tint behind a destructive icon: flags the danger without shouting in a list. */
  dangerSubtle: string;
  dangerSubtleBorder: string;
  /**
   * Series of a breakdown chart (disk use). Distinct hues rather than the
   * status colors, which would read as good or bad; always paired with a
   * text legend.
   */
  series: readonly string[];
  /** Backdrop laid behind modal sheets. */
  backdrop: string;
}

/**
 * Palettes derived from Portainer's brand identity.
 *
 * Both are tuned against WCAG AA: text reaches 4.5:1 on every surface it
 * sits on, input borders 3:1. The brand blue and red are too light to carry
 * white text, so filled buttons use their darker `*Fill` variants instead.
 * In the light palette, `accent`, `success`, `warning` and `danger` also
 * serve as text, hence their darker shades.
 */
const darkColors: ThemeColors = {
  bg: '#0d1117',
  surface: '#161b22',
  surfaceAlt: '#21262d',
  border: '#3d444d',
  borderStrong: '#6e7681',
  text: '#f0f6fc',
  textMuted: '#9da5ae',
  accent: '#0ba5ec',
  accentFill: '#0a6fa8',
  accentDim: '#0b5f85',
  accentSubtle: 'rgba(11, 165, 236, 0.15)',
  onFill: '#ffffff',
  success: '#3fb950',
  warning: '#d29922',
  danger: '#f85149',
  dangerFill: '#c93c37',
  dangerSubtle: 'rgba(248, 81, 73, 0.12)',
  dangerSubtleBorder: 'rgba(248, 81, 73, 0.35)',
  series: ['#0ba5ec', '#a371f7', '#2dd4bf', '#f778ba'],
  backdrop: 'rgba(1, 4, 9, 0.6)',
};

const lightColors: ThemeColors = {
  bg: '#f6f8fa',
  surface: '#ffffff',
  surfaceAlt: '#eef1f4',
  border: '#d1d9e0',
  borderStrong: '#818b98',
  text: '#1f2328',
  textMuted: '#59636e',
  accent: '#0a6fa8',
  accentFill: '#0a6fa8',
  accentDim: '#cce6f6',
  accentSubtle: 'rgba(10, 111, 168, 0.1)',
  onFill: '#ffffff',
  success: '#1a7f37',
  warning: '#9a6700',
  danger: '#cf222e',
  dangerFill: '#c93c37',
  dangerSubtle: 'rgba(207, 34, 46, 0.08)',
  dangerSubtleBorder: 'rgba(207, 34, 46, 0.3)',
  series: ['#0a6fa8', '#8250df', '#0f8a7e', '#bf3989'],
  backdrop: 'rgba(31, 35, 40, 0.4)',
};

const radius = { sm: 6, md: 10, lg: 14, xl: 20 } as const;
const spacing = (n: number) => n * 4;

export interface Theme {
  scheme: ColorScheme;
  colors: ThemeColors;
  radius: typeof radius;
  spacing: typeof spacing;
}

export const darkTheme: Theme = { scheme: 'dark', colors: darkColors, radius, spacing };
export const lightTheme: Theme = { scheme: 'light', colors: lightColors, radius, spacing };

const THEMES: Record<ColorScheme, Theme> = { dark: darkTheme, light: lightTheme };

export function themeFor(scheme: ColorScheme): Theme {
  return THEMES[scheme];
}

// Dark by default: it was the app's only look, and it keeps components
// rendered outside the provider (tests) on a known palette.
export const ThemeContext = createContext<Theme>(darkTheme);

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/**
 * `StyleSheet.create` for themed styles: both sheets are built once, up
 * front, and the returned hook hands out the one for the current scheme.
 */
export function createStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (theme: Theme) => T,
): () => T {
  const sheets: Record<ColorScheme, T> = {
    dark: StyleSheet.create(factory(darkTheme)),
    light: StyleSheet.create(factory(lightTheme)),
  };
  return function useStyles() {
    return sheets[useTheme().scheme];
  };
}
