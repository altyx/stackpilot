import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { groupByStack } from '../lib/stacks';
import { makeContainer } from '../testing/fixtures';
import { StackActionSheet } from './StackActionSheet';

const stack = (name: string) =>
  groupByStack([
    makeContainer({
      Id: `${name}-1`,
      Names: [`/${name}-db`],
      Labels: label(name),
      State: 'exited',
    }),
    makeContainer({ Id: `${name}-2`, Names: [`/${name}-web`], Labels: label(name) }),
  ])[0];
const label = (project: string) => ({ 'com.docker.compose.project': project });

describe('StackActionSheet', () => {
  it('renders nothing without a stack', () => {
    render(<StackActionSheet section={null} onConfirm={jest.fn()} onClose={jest.fn()} />);
    expect(screen.toJSON()).toBeNull();
  });

  it('offers start and stop, then asks for confirmation with the members listed', () => {
    render(<StackActionSheet section={stack('blog')} onConfirm={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByText('blog')).toBeOnTheScreen();
    expect(screen.getByText('1/2 en cours · 2 conteneurs')).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Arrêter la stack' }));
    expect(screen.getByText('Arrêter la stack ?')).toBeOnTheScreen();
    expect(screen.getByText('blog-db')).toBeOnTheScreen();
    expect(screen.getByText('blog-web')).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Retour' }));
    expect(screen.getByText('1/2 en cours · 2 conteneurs')).toBeOnTheScreen();
  });

  it('reports the action once the sheet has closed', async () => {
    const section = stack('blog');
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    render(<StackActionSheet section={section} onConfirm={onConfirm} onClose={onClose} />);

    fireEvent.press(screen.getByRole('button', { name: 'Démarrer la stack' }));
    fireEvent.press(screen.getByRole('button', { name: 'Démarrer' }));
    expect(onConfirm).not.toHaveBeenCalled();

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(section, 'start'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes without reporting when cancelled', async () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    render(<StackActionSheet section={stack('blog')} onConfirm={onConfirm} onClose={onClose} />);
    fireEvent.press(screen.getByRole('button', { name: 'Annuler' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('starts over at the choice step when another stack opens', () => {
    render(<StackActionSheet section={stack('blog')} onConfirm={jest.fn()} onClose={jest.fn()} />);
    fireEvent.press(screen.getByRole('button', { name: 'Arrêter la stack' }));
    expect(screen.getByText('Arrêter la stack ?')).toBeOnTheScreen();

    screen.rerender(
      <StackActionSheet section={stack('shop')} onConfirm={jest.fn()} onClose={jest.fn()} />,
    );
    expect(screen.getByText('shop')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Arrêter la stack' })).toBeOnTheScreen();
  });
});
