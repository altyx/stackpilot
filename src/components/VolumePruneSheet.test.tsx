import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { makeVolume } from '../testing/fixtures';
import { VolumePruneSheet } from './VolumePruneSheet';

const anonymous = makeVolume({
  Name: 'f'.repeat(64),
  Labels: { 'com.docker.volume.anonymous': '' },
});
const named = makeVolume({ Name: 'pgdata' });
const usages = [
  { item: anonymous, usedBy: [] },
  { item: named, usedBy: [] },
  { item: makeVolume({ Name: 'used' }), usedBy: ['web'] },
];
const sizes = new Map([
  [anonymous.Name, 1_000],
  [named.Name, 2_000_000_000],
]);

function renderSheet(props: Partial<ComponentProps<typeof VolumePruneSheet>> = {}) {
  const onConfirm = jest.fn();
  const onClose = jest.fn();
  render(
    <VolumePruneSheet
      visible
      usages={usages}
      sizes={sizes}
      anonymousScopeAvailable
      onConfirm={onConfirm}
      onClose={onClose}
      {...props}
    />,
  );
  return { onConfirm, onClose };
}

describe('VolumePruneSheet', () => {
  it('previews both scopes with count and size', () => {
    renderSheet();
    expect(screen.getByRole('button', { name: 'Anonymous volumes · 1 · 1.0 kB' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'All unused volumes · 2 · 2.0 GB' })).toBeEnabled();
  });

  it('hides the anonymous scope on engines that would prune named volumes too', () => {
    renderSheet({ anonymousScopeAvailable: false });
    expect(screen.queryByRole('button', { name: /^Anonymous volumes/ })).toBeNull();
    expect(screen.getByText(/older than version 23/)).toBeOnTheScreen();
  });

  it('lists what goes and waits for the typed word before deleting', async () => {
    const { onConfirm, onClose } = renderSheet();
    fireEvent.press(screen.getByRole('button', { name: /^All unused volumes/ }));
    expect(screen.getByText('Delete 2 volumes?')).toBeOnTheScreen();
    expect(screen.getByText('pgdata')).toBeOnTheScreen();
    expect(screen.queryByText('used')).toBeNull();

    const confirm = screen.getByRole('button', { name: 'Delete permanently' });
    expect(confirm).toBeDisabled();
    fireEvent.changeText(screen.getByLabelText('Type delete to confirm'), 'delete');
    fireEvent.press(confirm);

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('all'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clears the typed word when going back to the choice', () => {
    renderSheet();
    fireEvent.press(screen.getByRole('button', { name: /^Anonymous volumes/ }));
    fireEvent.changeText(screen.getByLabelText('Type delete to confirm'), 'delete');
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    screen.rerender(
      <VolumePruneSheet
        visible={false}
        usages={usages}
        sizes={sizes}
        anonymousScopeAvailable
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    screen.rerender(
      <VolumePruneSheet
        visible
        usages={usages}
        sizes={sizes}
        anonymousScopeAvailable
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByRole('button', { name: /^Anonymous volumes/ }));
    expect(screen.getByRole('button', { name: 'Delete permanently' })).toBeDisabled();
  });
});
