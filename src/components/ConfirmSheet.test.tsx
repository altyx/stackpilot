import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { Text } from 'react-native';
import { ConfirmSheet } from './ConfirmSheet';

function renderSheet(props: Partial<ComponentProps<typeof ConfirmSheet>> = {}) {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  render(
    <ConfirmSheet
      visible
      title="Arrêter le conteneur ?"
      message="Il restera arrêté."
      confirmLabel="Arrêter"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}>
      <Text>Contenu</Text>
    </ConfirmSheet>,
  );
  return { onConfirm, onCancel };
}

describe('ConfirmSheet', () => {
  it('shows the title, message, content and both actions', () => {
    renderSheet();
    expect(screen.getByText('Arrêter le conteneur ?')).toBeOnTheScreen();
    expect(screen.getByText('Il restera arrêté.')).toBeOnTheScreen();
    expect(screen.getByText('Contenu')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Arrêter' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeOnTheScreen();
  });

  it('renders nothing while hidden', () => {
    renderSheet({ visible: false });
    expect(screen.queryByText('Arrêter le conteneur ?')).toBeNull();
  });

  it('confirms only once the sheet has closed', async () => {
    const { onConfirm, onCancel } = renderSheet();
    fireEvent.press(screen.getByRole('button', { name: 'Arrêter' }));
    expect(onConfirm).not.toHaveBeenCalled();
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('cancels from the backdrop', async () => {
    const { onConfirm, onCancel } = renderSheet();
    // The sheet is modal for accessibility, so the backdrop behind it is hidden.
    fireEvent.press(screen.getByLabelText('Fermer', { includeHiddenElements: true }));
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
