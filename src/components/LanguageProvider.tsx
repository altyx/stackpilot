import { useEffect, type ReactNode } from 'react';
import i18n from '../i18n';
import { useSettings } from '../settings/SettingsContext';

/** Applies the language chosen in the settings. */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const { language } = useSettings().settings;

  // react-i18next renders the screens again once the language has changed.
  useEffect(() => {
    void i18n.changeLanguage(language);
  }, [language]);

  return children;
}
