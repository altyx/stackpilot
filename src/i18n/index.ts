import { createContext, useContext } from 'react';
import { en, type Strings } from './en';
import { fr } from './fr';

export type { Strings };

export type Language = 'en' | 'fr';

/** Each language under its own name: a reader lost in the wrong one still finds theirs. */
export const LANGUAGES: readonly { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
];

const CATALOGS: Record<Language, Strings> = { en, fr };

export function stringsFor(language: Language): Strings {
  return CATALOGS[language];
}

// English by default: it keeps components rendered outside the provider
// (tests) on the reference wording.
export const StringsContext = createContext<Strings>(en);

/** The interface text in the language chosen in the settings. */
export function useStrings(): Strings {
  return useContext(StringsContext);
}

let current: Strings = en;

/**
 * Code outside React (API errors, the notification channel) has no context
 * to read: the provider records the language here. Render code must not read
 * it: the React Compiler memoizes on props and context only, and would keep
 * the previous language.
 */
export function setCurrentLanguage(language: Language): void {
  current = CATALOGS[language];
}

export function strings(): Strings {
  return current;
}
