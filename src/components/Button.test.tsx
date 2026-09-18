import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button } from './Button';

describe('Button', () => {
  it('calls onPress', () => {
    const onPress = jest.fn();
    render(<Button label="Valider" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Valider' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('ignores presses while disabled', () => {
    const onPress = jest.fn();
    render(<Button label="Valider" onPress={onPress} disabled />);
    const button = screen.getByRole('button', { name: 'Valider' });
    expect(button).toBeDisabled();
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('replaces the label with a spinner while loading', () => {
    render(<Button label="Valider" onPress={jest.fn()} loading />);
    expect(screen.queryByText('Valider')).toBeNull();
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button')).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ busy: true }),
    );
  });
});
