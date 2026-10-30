import { useEffect, type ReactNode } from 'react';
import { setCurrentLanguage, stringsFor, StringsContext } from '../i18n';
import { useSettings } from '../settings/SettingsContext';

/** Applies the language chosen in the settings. */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const { language } = useSettings().settings;

  // Errors are worded when thrown, after a request: an effect is soon enough.
  useEffect(() => {
    setCurrentLanguage(language);
  }, [language]);

  return <StringsContext.Provider value={stringsFor(language)}>{children}</StringsContext.Provider>;
}
