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
    expect(screen.getByText('Clean up images')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Untagged images · 1 · 3.0 kB' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'All unused images · 2 · 5.0 kB' })).toBeEnabled();
  });

  it('disables a scope with nothing to delete', () => {
    renderSheet({ usages: usages.filter((usage) => usage.item.Id !== 'sha256:dangling') });
    expect(screen.getByRole('button', { name: 'Untagged images · none' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'All unused images · 1 · 2.0 kB' })).toBeEnabled();
  });

  it('lists the images a full cleanup deletes, then goes back to the choice', () => {
    renderSheet();
    fireEvent.press(screen.getByRole('button', { name: 'All unused images · 2 · 5.0 kB' }));
    expect(screen.getByText('Delete 2 images?')).toBeOnTheScreen();
    expect(screen.getByText(/tagged ones included/)).toBeOnTheScreen();
    expect(screen.getByText('app:1')).toBeOnTheScreen();
    expect(screen.getByText('3.0 kB')).toBeOnTheScreen();
    expect(screen.queryByText('nginx:1.27')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Clean up images')).toBeOnTheScreen();
  });

  it('lists only untagged images for a dangling cleanup', () => {
    renderSheet();
    fireEvent.press(screen.getByRole('button', { name: 'Untagged images · 1 · 3.0 kB' }));
    expect(screen.getByText('Delete image?')).toBeOnTheScreen();
    expect(screen.getByText(/left over from builds/)).toBeOnTheScreen();
    expect(screen.queryByText('app:1')).toBeNull();
  });

  it('summarizes long lists', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      item: makeImage({ Id: `sha256:${i}`, RepoTags: [`app:${i}`] }),
      usedBy: [],
    }));
    renderSheet({ usages: many });
    fireEvent.press(screen.getByRole('button', { name: /^All unused images/ }));
    expect(screen.getByText('app:5')).toBeOnTheScreen();
    expect(screen.queryByText('app:6')).toBeNull();
    expect(screen.getByText('and 2 more')).toBeOnTheScreen();
  });

  it('reports the scope once the sheet has closed', async () => {
    const { onConfirm, onClose } = renderSheet();
    fireEvent.press(screen.getByRole('button', { name: 'Untagged images · 1 · 3.0 kB' }));
    fireEvent.press(screen.getByRole('button', { name: 'Clean up' }));
    expect(onConfirm).not.toHaveBeenCalled();

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('dangling'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes without reporting when cancelled', async () => {
    const { onConfirm, onClose } = renderSheet();
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('starts over at the choice step on every opening', () => {
    const props = { usages, onConfirm: jest.fn(), onClose: jest.fn() };
    render(<ImagePruneSheet visible {...props} />);
    fireEvent.press(screen.getByRole('button', { name: 'Untagged images · 1 · 3.0 kB' }));
    expect(screen.getByText('Delete image?')).toBeOnTheScreen();

    screen.rerender(<ImagePruneSheet visible={false} {...props} />);
    screen.rerender(<ImagePruneSheet visible {...props} />);
    expect(screen.getByText('Clean up images')).toBeOnTheScreen();
  });
});
