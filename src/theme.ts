/** Palette dérivée de l'identité Portainer, déclinée en thème sombre. */
export const theme = {
  colors: {
    bg: '#0d1117',
    surface: '#161b22',
    surfaceAlt: '#1c2129',
    border: '#2a313c',
    text: '#e6edf3',
    textMuted: '#8b949e',
    accent: '#0ba5ec',
    accentDim: '#0b5f85',
    success: '#3fb950',
    warning: '#d29922',
    danger: '#f85149',
    /** Voile posé derrière les feuilles modales. */
    backdrop: 'rgba(1, 4, 9, 0.6)',
  },
  radius: { sm: 6, md: 10, lg: 14, xl: 20 },
  spacing: (n: number) => n * 4,
} as const;

export type Theme = typeof theme;
