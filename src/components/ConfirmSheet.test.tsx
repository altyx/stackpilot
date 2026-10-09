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
      title="Stop container?"
      message="It will stay stopped."
      confirmLabel="Stop"
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
    expect(screen.getByText('Stop container?')).toBeOnTheScreen();
    expect(screen.getByText('It will stay stopped.')).toBeOnTheScreen();
    expect(screen.getByText('Contenu')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeOnTheScreen();
  });

  it('renders nothing while hidden', () => {
    renderSheet({ visible: false });
    expect(screen.queryByText('Stop container?')).toBeNull();
  });

  it('confirms only once the sheet has closed', async () => {
    const { onConfirm, onCancel } = renderSheet();
    fireEvent.press(screen.getByRole('button', { name: 'Stop' }));
    expect(onConfirm).not.toHaveBeenCalled();
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('cancels from the backdrop', async () => {
    const { onConfirm, onCancel } = renderSheet();
    // The sheet is modal for accessibility, so the backdrop behind it is hidden.
    fireEvent.press(screen.getByLabelText('Close', { includeHiddenElements: true }));
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('waits for the phrase before confirming, then starts empty again', async () => {
    const { onConfirm, onCancel } = renderSheet({ confirmPhrase: 'pgdata' });
    const confirm = screen.getByRole('button', { name: 'Stop' });
    expect(confirm).toBeDisabled();

    const field = screen.getByLabelText('Type pgdata to confirm');
    fireEvent.changeText(field, 'pgdat');
    expect(confirm).toBeDisabled();
    // Auto-capitalisation and a stray space must not block the user.
    fireEvent.changeText(field, ' PGdata ');
    expect(confirm).toBeEnabled();

    fireEvent.press(confirm);
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(onCancel).not.toHaveBeenCalled();

    screen.rerender(
      <ConfirmSheet
        visible={false}
        title="t"
        confirmLabel="Stop"
        confirmPhrase="pgdata"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    screen.rerender(
      <ConfirmSheet
        visible
        title="t"
        confirmLabel="Stop"
        confirmPhrase="pgdata"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByRole('button', { name: 'Stop' })).toBeDisabled();
  });
});
