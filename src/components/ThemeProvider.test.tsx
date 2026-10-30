import * as ReactNative from 'react-native';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { SettingsProvider } from '../settings/SettingsContext';
import { memory } from '../testing/secureStoreMock';
import { useTheme } from '../theme';
import { ThemeProvider } from './ThemeProvider';

jest.mock(
  'expo-secure-store',
  () =>
    jest.requireActual<typeof import('../testing/secureStoreMock')>('../testing/secureStoreMock')
      .secureStoreMock,
);

function SchemeProbe() {
  return <Text>{useTheme().scheme}</Text>;
}

function renderWith(device: ReactNative.ColorSchemeName, appearance?: string) {
  jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue(device);
  if (appearance) memory.set('app.settings', JSON.stringify({ appearance }));
  render(
    <SettingsProvider>
      <ThemeProvider>
        <SchemeProbe />
      </ThemeProvider>
    </SettingsProvider>,
  );
}

beforeEach(() => memory.clear());

describe('ThemeProvider', () => {
  it('follows the device by default', () => {
    renderWith('light');
    expect(screen.getByText('light')).toBeOnTheScreen();
  });

  it('stays dark when the device states no scheme', () => {
    renderWith('unspecified');
    expect(screen.getByText('dark')).toBeOnTheScreen();
  });

  it('applies the appearance chosen in the settings over the device', async () => {
    renderWith('light', 'dark');
    expect(await screen.findByText('dark')).toBeOnTheScreen();
  });
});
