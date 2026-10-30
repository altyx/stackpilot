import { QueryClient } from '@tanstack/react-query';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import SettingsScreen from '../app/(drawer)/settings';
import i18n from '../src/i18n';
import { memory } from '../src/testing/secureStoreMock';
import { createTestLayout } from '../src/testing/TestLayout';

jest.mock(
  'expo-secure-store',
  () =>
    jest.requireActual<typeof import('../src/testing/secureStoreMock')>(
      '../src/testing/secureStoreMock',
    ).secureStoreMock,
);

beforeEach(() => memory.clear());
afterEach(() => i18n.changeLanguage('en'));

describe('settings screen', () => {
  it('switches the interface to French and keeps the choice', async () => {
    const queryClient = new QueryClient();
    renderRouter(
      { _layout: createTestLayout(queryClient), settings: SettingsScreen },
      { initialUrl: '/settings' },
    );

    fireEvent.press(await screen.findByRole('button', { name: 'Language, English' }));
    fireEvent.press(await screen.findByRole('radio', { name: 'Français' }));

    expect(await screen.findByRole('button', { name: 'Langue, Français' })).toBeOnTheScreen();
    expect(screen.getByText('Toutes les 15 secondes')).toBeOnTheScreen();
    expect(memory.get('app.settings')).toContain('"language":"fr"');
  });
});
