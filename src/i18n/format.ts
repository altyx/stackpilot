import { useTranslation } from 'react-i18next';
import { formatBytes, formatDate, formatPercent, type LocaleFormat } from '../lib/format';
import type { Language } from '.';

// Written by hand rather than through `Intl`: engines disagree on month
// abbreviations ("Sep" or "Sept") and on the 24-hour clock.
const FORMATS: Record<Language, LocaleFormat> = {
  en: {
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    dateTime: (day, time) => `${day}, ${time}`,
    decimal: '.',
    byteUnits: ['B', 'kB', 'MB', 'GB', 'TB'],
    percent: (value) => `${value}%`,
  },
  fr: {
    months: [
      'janv.',
      'févr.',
      'mars',
      'avr.',
      'mai',
      'juin',
      'juil.',
      'août',
      'sept.',
      'oct.',
      'nov.',
      'déc.',
    ],
    dateTime: (day, time) => `${day} à ${time}`,
    decimal: ',',
    byteUnits: ['o', 'ko', 'Mo', 'Go', 'To'],
    // Non-breaking: the sign never wraps away from its number.
    percent: (value) => `${value} %`,
  },
};

export interface Formatters {
  date: (value: string | number) => string;
  bytes: (value: number) => string;
  percent: (value: number) => string;
}

/** Dates, sizes and shares written the way a language writes them. */
export function formattersFor(language: string): Formatters {
  const format = FORMATS[language === 'fr' ? 'fr' : 'en'];
  return {
    date: (value) => formatDate(value, format),
    bytes: (value) => formatBytes(value, format),
    percent: (value) => formatPercent(value, format),
  };
}

/** `formattersFor` the current language, rendering again when it changes. */
export function useFormat(): Formatters {
  const { i18n } = useTranslation();
  return formattersFor(i18n.language);
}
