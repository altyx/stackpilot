import 'i18next';
import type en from './locales/en.json';

// Keys are checked against the English catalog, the reference one.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof en };
  }
}
