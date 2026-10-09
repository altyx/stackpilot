import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { CodeBlock } from './CodeBlock';

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));

describe('CodeBlock', () => {
  it('copies the command and confirms it in place', async () => {
    render(<CodeBlock code="mkcert -CAROOT" />);
    expect(screen.getByText('mkcert -CAROOT')).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Copy' }));
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('mkcert -CAROOT');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copied' })).toBeOnTheScreen());
  });
});
