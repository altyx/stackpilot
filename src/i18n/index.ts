import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import fr from './locales/fr.json';

export type Language = 'en' | 'fr';

/** Each language under its own name: a reader lost in the wrong one still finds theirs. */
export const LANGUAGES: readonly { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
];

export const resources = {
  en: { translation: en },
  fr: { translation: fr },
} as const;

// English until the settings say otherwise: `LanguageProvider` switches it.
// Synchronous init: the catalogs are bundled, the first frame has its text.
const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  initAsync: false,
  // React already escapes what it renders.
  interpolation: { escapeValue: false },
});

export default i18n;
