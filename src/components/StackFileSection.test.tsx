import { fireEvent, render, screen } from '@testing-library/react-native';
import { useStackFile } from '../api/hooks';
import { StackFileSection } from './StackFileSection';

jest.mock('../api/hooks', () => ({ useStackFile: jest.fn() }));

type Query = ReturnType<typeof useStackFile>;
const query = (partial: Partial<Query>) =>
  jest
    .mocked(useStackFile)
    .mockReturnValue({ data: undefined, isPending: false, error: null, ...partial } as Query);

const open = () =>
  fireEvent.press(screen.getByRole('button', { name: 'Afficher le fichier Compose' }));

describe('StackFileSection', () => {
  it('loads the file only once asked, and closes again', () => {
    query({ data: 'services:\n  web: {}' });
    render(<StackFileSection stackId={7} />);
    expect(useStackFile).toHaveBeenLastCalledWith(null);

    open();
    expect(useStackFile).toHaveBeenLastCalledWith(7);
    expect(screen.getByText('services:\n  web: {}')).toBeOnTheScreen();
    expect(screen.queryByText(/Révéler les secrets/)).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Masquer le fichier Compose' }));
    expect(screen.queryByText('services:\n  web: {}')).toBeNull();
    expect(screen.getByRole('button', { name: 'Afficher le fichier Compose' })).toBeOnTheScreen();
  });

  it('closes from the header link as well', () => {
    query({ data: 'services: {}' });
    render(<StackFileSection stackId={7} />);
    open();
    fireEvent.press(screen.getByRole('button', { name: 'Fermer' }));
    expect(screen.queryByText('services: {}')).toBeNull();
  });

  it('hides credentials until revealed', () => {
    query({ data: 'environment:\n  DB_PASSWORD: hunter2' });
    render(<StackFileSection stackId={7} />);
    open();
    expect(screen.getByText('environment:\n  DB_PASSWORD: ••••••••')).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Révéler les secrets (1)' }));
    expect(screen.getByText('environment:\n  DB_PASSWORD: hunter2')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Masquer les secrets' })).toBeOnTheScreen();
  });

  it('reports a file it cannot read', () => {
    query({ error: new Error('Accès refusé') });
    render(<StackFileSection stackId={7} />);
    open();
    expect(screen.getByText('Accès refusé')).toBeOnTheScreen();
  });
});
