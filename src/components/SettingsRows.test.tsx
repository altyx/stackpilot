import { fireEvent, render, screen } from '@testing-library/react-native';
import { SettingsChoiceRow } from './SettingsChoiceRow';
import { SettingsNavRow } from './SettingsNavRow';

describe('SettingsChoiceRow', () => {
  it('is a radio reflecting its selection', () => {
    render(<SettingsChoiceRow label="Manuel" selected first onPress={jest.fn()} />);
    expect(screen.getByRole('radio', { name: 'Manuel' })).toBeChecked();
  });

  it('reports presses', () => {
    const onPress = jest.fn();
    render(<SettingsChoiceRow label="Manuel" selected={false} first onPress={onPress} />);
    const row = screen.getByRole('radio', { name: 'Manuel' });
    expect(row).not.toBeChecked();
    fireEvent.press(row);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('SettingsNavRow', () => {
  it('is a button with an optional hint', () => {
    const onPress = jest.fn();
    render(
      <SettingsNavRow icon="bug-outline" label="Signaler" hint="Ouvre GitHub" onPress={onPress} />,
    );
    expect(screen.getByText('Ouvre GitHub')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: /Signaler/ }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('announces itself as a link when it leaves the app', () => {
    render(<SettingsNavRow icon="logo-github" label="Code source" external onPress={jest.fn()} />);
    expect(screen.getByRole('link', { name: /Code source/ })).toBeOnTheScreen();
  });
});
