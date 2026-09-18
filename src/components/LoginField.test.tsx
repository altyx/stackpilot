import { fireEvent, render, screen } from '@testing-library/react-native';
import { LoginField } from './LoginField';

describe('LoginField', () => {
  it('masks a secret and reveals it on demand', () => {
    render(<LoginField label="Mot de passe" value="hunter2" onChangeText={jest.fn()} secret />);
    const input = screen.getByDisplayValue('hunter2');
    expect(input).toHaveProp('secureTextEntry', true);
    expect(input).toHaveProp('autoCapitalize', 'none');

    fireEvent.press(screen.getByRole('button', { name: 'Afficher la saisie' }));
    expect(input).toHaveProp('secureTextEntry', false);

    fireEvent.press(screen.getByRole('button', { name: 'Masquer la saisie' }));
    expect(input).toHaveProp('secureTextEntry', true);
  });

  it('has no toggle for plain fields', () => {
    render(<LoginField label="URL" value="https://x" onChangeText={jest.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByDisplayValue('https://x')).toHaveProp('secureTextEntry', false);
  });

  it('shows its label and forwards input props', () => {
    const onChangeText = jest.fn();
    render(
      <LoginField label="Utilisateur" value="" onChangeText={onChangeText} placeholder="admin" />,
    );
    expect(screen.getByText('Utilisateur')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByPlaceholderText('admin'), 'root');
    expect(onChangeText).toHaveBeenCalledWith('root');
  });
});
