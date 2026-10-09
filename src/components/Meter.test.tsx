import { render, screen } from '@testing-library/react-native';
import { theme } from '../theme';
import { Meter } from './Meter';

describe('Meter', () => {
  it('announces its value and fills to the ratio', () => {
    render(<Meter label="Memory" value="2 GB / 8 GB" ratio={0.25} />);
    const meter = screen.getByRole('progressbar', { name: 'Memory: 2 GB / 8 GB' });
    expect(meter).toHaveProp('accessibilityValue', { min: 0, max: 100, now: 25 });
  });

  it('turns warning, then danger, as room runs out', () => {
    const fill = () => screen.getByTestId('meter-fill');
    render(<Meter label="CPU" value="" ratio={0.5} />);
    expect(fill()).toHaveStyle({ backgroundColor: theme.colors.accent });
    screen.rerender(<Meter label="CPU" value="" ratio={0.8} />);
    expect(fill()).toHaveStyle({ backgroundColor: theme.colors.warning });
    screen.rerender(<Meter label="CPU" value="" ratio={1.4} />);
    expect(fill()).toHaveStyle({ backgroundColor: theme.colors.danger, width: '100%' });
  });
});
