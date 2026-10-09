import { fireEvent, render, screen } from '@testing-library/react-native';
import { PortainerError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ErrorView } from './ErrorView';

jest.mock('../auth/AuthContext', () => ({ useAuth: jest.fn() }));

const signOut = jest.fn(() => Promise.resolve());

beforeEach(() => {
  jest.mocked(useAuth).mockReturnValue({ signOut } as unknown as ReturnType<typeof useAuth>);
});

describe('ErrorView', () => {
  it('shows the error message and detail', () => {
    render(<ErrorView error={new PortainerError('Outage', 500, 'server trace')} />);
    expect(screen.getByText('Outage')).toBeOnTheScreen();
    expect(screen.getByText('server trace')).toBeOnTheScreen();
  });

  it('falls back to a generic message for non-errors', () => {
    render(<ErrorView error="?" />);
    expect(screen.getByText('An unexpected error occurred.')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('offers to retry', () => {
    const onRetry = jest.fn();
    render(<ErrorView error={new Error('Outage')} onRetry={onRetry} />);
    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('offers to sign in again instead of retrying after a 401', () => {
    render(<ErrorView error={new PortainerError('Refused', 401)} onRetry={jest.fn()} />);
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Sign in again' }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
