import { fireEvent, render, screen } from '@testing-library/react-native';
import { SettingsChoiceRow } from './SettingsChoiceRow';
import { SettingsNavRow } from './SettingsNavRow';
import { SettingsSelect } from './SettingsSelect';

describe('SettingsChoiceRow', () => {
  it('is a radio reflecting its selection', () => {
    render(<SettingsChoiceRow label="Manual" selected first onPress={jest.fn()} />);
    expect(screen.getByRole('radio', { name: 'Manual' })).toBeChecked();
  });

  it('reports presses', () => {
    const onPress = jest.fn();
    render(<SettingsChoiceRow label="Manual" selected={false} first onPress={onPress} />);
    const row = screen.getByRole('radio', { name: 'Manual' });
    expect(row).not.toBeChecked();
    fireEvent.press(row);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('SettingsNavRow', () => {
  it('is a button with an optional hint', () => {
    const onPress = jest.fn();
    render(
      <SettingsNavRow icon="bug-outline" label="Report" hint="Opens GitHub" onPress={onPress} />,
    );
    expect(screen.getByText('Opens GitHub')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: /Report/ }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('announces itself as a link when it leaves the app', () => {
    render(<SettingsNavRow icon="logo-github" label="Source code" external onPress={jest.fn()} />);
    expect(screen.getByRole('link', { name: /Source code/ })).toBeOnTheScreen();
  });
});

describe('SettingsSelect', () => {
  const options = [
    { value: 'en', label: 'English' },
    { value: 'fr', label: 'Français' },
  ] as const;

  it('shows the current value and offers the others in a sheet', async () => {
    const onChange = jest.fn();
    render(
      <SettingsSelect
        title="Language"
        icon="language-outline"
        options={options}
        value="en"
        onChange={onChange}
      />,
    );
    expect(screen.queryByRole('radio')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Language, English' }));
    expect(await screen.findByRole('radio', { name: 'English' })).toBeChecked();
    // Each language keeps its own name, whatever the interface speaks.
    fireEvent.press(screen.getByRole('radio', { name: 'Français' }));
    expect(onChange).toHaveBeenCalledWith('fr');
  });
});
