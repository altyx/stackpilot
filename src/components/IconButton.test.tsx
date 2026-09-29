import { fireEvent, render, screen } from '@testing-library/react-native';
import { IconButton } from './IconButton';

describe('IconButton', () => {
  it('is announced by its label and calls onPress', () => {
    const onPress = jest.fn();
    render(
      <IconButton icon="trash-outline" accessibilityLabel="Supprimer app:1" onPress={onPress} />,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Supprimer app:1' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('ignores presses while disabled', () => {
    const onPress = jest.fn();
    render(
      <IconButton
        icon="trash-outline"
        accessibilityLabel="Supprimer app:1"
        onPress={onPress}
        disabled
      />,
    );
    const button = screen.getByRole('button', { name: 'Supprimer app:1' });
    expect(button).toBeDisabled();
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
