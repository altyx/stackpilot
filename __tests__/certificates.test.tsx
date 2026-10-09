import { renderRouter, screen } from 'expo-router/testing-library';
import { Platform } from 'react-native';
import CertificatesScreen from '../app/certificates';
import { CERTIFICATE_SOLUTIONS } from '../src/help/certificates';

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));

function renderScreen() {
  renderRouter({ certificates: CertificatesScreen }, { initialUrl: '/certificates' });
}

describe('certificate help screen', () => {
  const originalOS = Platform.OS;
  afterEach(() => {
    Platform.OS = originalOS;
  });

  it('presents every solution with its commands', () => {
    renderScreen();
    for (const solution of CERTIFICATE_SOLUTIONS) {
      expect(screen.getByText(solution.title)).toBeOnTheScreen();
    }
    expect(
      screen.getByText('tailscale serve --bg https+insecure://localhost:9443'),
    ).toBeOnTheScreen();
    expect(screen.getByText('mkcert -CAROOT')).toBeOnTheScreen();
  });

  it('shows the iPhone steps on iOS', () => {
    Platform.OS = 'ios';
    renderScreen();
    expect(screen.getByText(/full trust/)).toBeOnTheScreen();
    expect(screen.queryByText(/Encryption & credentials/)).toBeNull();
  });

  it('shows the Android steps on Android', () => {
    Platform.OS = 'android';
    renderScreen();
    expect(screen.getByText(/Encryption & credentials/)).toBeOnTheScreen();
    expect(screen.queryByText(/full trust/)).toBeNull();
  });
});
