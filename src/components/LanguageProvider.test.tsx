import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { setCurrentLanguage, strings, useStrings } from '../i18n';
import { SettingsProvider } from '../settings/SettingsContext';
import { memory } from '../testing/secureStoreMock';
import { LanguageProvider } from './LanguageProvider';

jest.mock(
  'expo-secure-store',
  () =>
    jest.requireActual<typeof import('../testing/secureStoreMock')>('../testing/secureStoreMock')
      .secureStoreMock,
);

function Probe() {
  return <Text>{useStrings().nav.settings}</Text>;
}

function renderWith(language?: string) {
  if (language) memory.set('app.settings', JSON.stringify({ language }));
  render(
    <SettingsProvider>
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    </SettingsProvider>,
  );
}

beforeEach(() => memory.clear());
afterEach(() => setCurrentLanguage('en'));

describe('LanguageProvider', () => {
  it('speaks English by default', () => {
    renderWith();
    expect(screen.getByText('Settings')).toBeOnTheScreen();
  });

  it('applies the language stored in the settings, outside React too', async () => {
    renderWith('fr');
    expect(await screen.findByText('Réglages')).toBeOnTheScreen();
    expect(strings().errors.urlRequired).toBe('L’URL de l’instance est obligatoire.');
  });
});
