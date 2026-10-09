import { fireEvent, render, screen } from '@testing-library/react-native';
import { StackEnvRow } from './StackEnvRow';

describe('StackEnvRow', () => {
  it('shows an ordinary variable in clear, with no toggle', () => {
    render(<StackEnvRow variable={{ name: 'TZ', value: 'Europe/Paris' }} />);
    expect(screen.getByText('Europe/Paris')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('hides a credential until asked, then hides it again', () => {
    render(<StackEnvRow variable={{ name: 'DB_PASSWORD', value: 'hunter2' }} />);
    expect(screen.queryByText('hunter2')).toBeNull();
    expect(screen.getByText('••••••••')).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Show DB_PASSWORD' }));
    expect(screen.getByText('hunter2')).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Hide DB_PASSWORD' }));
    expect(screen.queryByText('hunter2')).toBeNull();
  });
});
