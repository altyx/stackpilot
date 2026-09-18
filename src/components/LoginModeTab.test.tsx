import { fireEvent, render, screen } from '@testing-library/react-native';
import { LoginModeTab } from './LoginModeTab';

describe('LoginModeTab', () => {
  it('exposes its selection state and reacts to presses', () => {
    const onPress = jest.fn();
    render(<LoginModeTab label="Identifiants" active={false} onPress={onPress} />);
    const tab = screen.getByRole('button', { name: 'Identifiants' });
    expect(tab).not.toBeSelected();
    fireEvent.press(tab);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is selected when active', () => {
    render(<LoginModeTab label="Access token" active onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Access token' })).toBeSelected();
  });
});
