import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ImageSummary } from '../api/types';
import { makeImage } from '../testing/fixtures';
import type { Usage } from '../lib/usage';
import { ImagePruneSheet } from './ImagePruneSheet';

const usages: Usage<ImageSummary>[] = [
  { item: makeImage({ Id: 'sha256:used', RepoTags: ['nginx:1.27'], Size: 100 }), usedBy: ['web'] },
  { item: makeImage({ Id: 'sha256:old', RepoTags: ['app:1'], Size: 2_000 }), usedBy: [] },
  { item: makeImage({ Id: 'sha256:dangling', RepoTags: [], Size: 3_000 }), usedBy: [] },
];

function renderSheet(props: Partial<Parameters<typeof ImagePruneSheet>[0]> = {}) {
  const onConfirm = jest.fn();
  const onClose = jest.fn();
  render(
    <ImagePruneSheet visible usages={usages} onConfirm={onConfirm} onClose={onClose} {...props} />,
  );
  return { onConfirm, onClose };
}

describe('ImagePruneSheet', () => {
  it('previews both scopes with their count and size', () => {
    renderSheet();
    expect(screen.getByText('Nettoyer les images')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Images sans tag · 1 · 3,0 ko' })).toBeEnabled();
    expect(
      screen.getByRole('button', { name: 'Toutes les images inutilisées · 2 · 5,0 ko' }),
    ).toBeEnabled();
  });

  it('disables a scope with nothing to delete', () => {
    renderSheet({ usages: usages.filter((usage) => usage.item.Id !== 'sha256:dangling') });
    expect(screen.getByRole('button', { name: 'Images sans tag · aucune' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Toutes les images inutilisées · 1 · 2,0 ko' }),
    ).toBeEnabled();
  });

  it('lists the images a full cleanup deletes, then goes back to the choice', () => {
    renderSheet();
    fireEvent.press(
      screen.getByRole('button', { name: 'Toutes les images inutilisées · 2 · 5,0 ko' }),
    );
    expect(screen.getByText('Supprimer 2 images ?')).toBeOnTheScreen();
    expect(screen.getByText(/y compris celles portant un tag/)).toBeOnTheScreen();
    expect(screen.getByText('app:1')).toBeOnTheScreen();
    expect(screen.getByText('3,0 ko')).toBeOnTheScreen();
    expect(screen.queryByText('nginx:1.27')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Retour' }));
    expect(screen.getByText('Nettoyer les images')).toBeOnTheScreen();
  });

  it('lists only untagged images for a dangling cleanup', () => {
    renderSheet();
    fireEvent.press(screen.getByRole('button', { name: 'Images sans tag · 1 · 3,0 ko' }));
    expect(screen.getByText("Supprimer l'image ?")).toBeOnTheScreen();
    expect(screen.getByText(/restes de builds/)).toBeOnTheScreen();
    expect(screen.queryByText('app:1')).toBeNull();
  });

  it('summarizes long lists', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      item: makeImage({ Id: `sha256:${i}`, RepoTags: [`app:${i}`] }),
      usedBy: [],
    }));
    renderSheet({ usages: many });
    fireEvent.press(screen.getByRole('button', { name: /^Toutes les images inutilisées/ }));
    expect(screen.getByText('app:5')).toBeOnTheScreen();
    expect(screen.queryByText('app:6')).toBeNull();
    expect(screen.getByText('et 2 autres')).toBeOnTheScreen();
  });

  it('reports the scope once the sheet has closed', async () => {
    const { onConfirm, onClose } = renderSheet();
    fireEvent.press(screen.getByRole('button', { name: 'Images sans tag · 1 · 3,0 ko' }));
    fireEvent.press(screen.getByRole('button', { name: 'Nettoyer' }));
    expect(onConfirm).not.toHaveBeenCalled();

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('dangling'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes without reporting when cancelled', async () => {
    const { onConfirm, onClose } = renderSheet();
    fireEvent.press(screen.getByRole('button', { name: 'Annuler' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('starts over at the choice step on every opening', () => {
    const props = { usages, onConfirm: jest.fn(), onClose: jest.fn() };
    render(<ImagePruneSheet visible {...props} />);
    fireEvent.press(screen.getByRole('button', { name: 'Images sans tag · 1 · 3,0 ko' }));
    expect(screen.getByText("Supprimer l'image ?")).toBeOnTheScreen();

    screen.rerender(<ImagePruneSheet visible={false} {...props} />);
    screen.rerender(<ImagePruneSheet visible {...props} />);
    expect(screen.getByText('Nettoyer les images')).toBeOnTheScreen();
  });
});
