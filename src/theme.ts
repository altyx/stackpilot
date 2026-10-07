/**
 * Palette derived from Portainer's brand identity, in a dark theme.
 *
 * Tuned against WCAG AA: text reaches 4.5:1 on every surface it sits on,
 * input borders 3:1. The brand blue and red are too light to carry white
 * text, so filled buttons use their darker `*Fill` variants instead.
 */
export const theme = {
  colors: {
    bg: '#0d1117',
    surface: '#161b22',
    surfaceAlt: '#21262d',
    /** Card outlines and dividers: decorative, just enough to separate. */
    border: '#3d444d',
    /** Outline of interactive controls (fields), held to 3:1. */
    borderStrong: '#6e7681',
    text: '#f0f6fc',
    textMuted: '#9da5ae',
    accent: '#0ba5ec',
    /** Background of filled accent controls, dark enough for white text. */
    accentFill: '#0a6fa8',
    accentDim: '#0b5f85',
    /** Tint behind a control that is switched on. */
    accentSubtle: 'rgba(11, 165, 236, 0.15)',
    success: '#3fb950',
    warning: '#d29922',
    danger: '#f85149',
    /** Background of filled destructive controls, dark enough for white text. */
    dangerFill: '#c93c37',
    /** Tint behind a destructive icon: flags the danger without shouting in a list. */
    dangerSubtle: 'rgba(248, 81, 73, 0.12)',
    dangerSubtleBorder: 'rgba(248, 81, 73, 0.35)',
    /**
     * Series of a breakdown chart (disk use). Distinct hues rather than the
     * status colors, which would read as good or bad; always paired with a
     * text legend.
     */
    series: ['#0ba5ec', '#a371f7', '#2dd4bf', '#f778ba'],
    /** Backdrop laid behind modal sheets. */
    backdrop: 'rgba(1, 4, 9, 0.6)',
  },
  radius: { sm: 6, md: 10, lg: 14, xl: 20 },
  spacing: (n: number) => n * 4,
} as const;

export type Theme = typeof theme;
