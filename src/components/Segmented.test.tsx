import { fireEvent, render, screen } from '@testing-library/react-native';
import { Segmented } from './Segmented';

const options = [
  { value: 'all', label: 'Tous' },
  { value: 'running', label: 'En cours' },
] as const;

describe('Segmented', () => {
  it('marks the current option as selected', () => {
    render(<Segmented value="all" onChange={jest.fn()} options={[...options]} />);
    expect(screen.getByRole('button', { name: 'Tous' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'En cours' })).not.toBeSelected();
  });

  it('reports the value of the pressed option', () => {
    const onChange = jest.fn();
    render(<Segmented value="all" onChange={onChange} options={[...options]} />);
    fireEvent.press(screen.getByRole('button', { name: 'En cours' }));
    expect(onChange).toHaveBeenCalledWith('running');
  });
});
