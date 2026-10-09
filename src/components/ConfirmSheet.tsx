import { useState, type ReactNode } from 'react';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { SheetActions } from './SheetActions';
import { SheetHeader } from './SheetHeader';
import { matchesPhrase, TypedConfirmation } from './TypedConfirmation';

export interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  destructive?: boolean;
  /** For irreversible data loss: the confirm button waits for this to be typed. */
  confirmPhrase?: string;
  /** Called once the sheet has fully closed. */
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  destructive = false,
  confirmPhrase,
  onConfirm,
  onCancel,
  children,
}: ConfirmSheetProps) {
  // Remembers why the sheet is closing: the callback only fires once the animation ends.
  const [outcome, setOutcome] = useState<'confirm' | 'cancel' | null>(null);
  const close = (next: 'confirm' | 'cancel') => setOutcome((current) => current ?? next);

  // Every opening starts with an empty field: a phrase typed for a previous
  // target must not pre-confirm the next one.
  const [typed, setTyped] = useState('');
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setTyped('');
  }
  const confirmed = confirmPhrase === undefined || matchesPhrase(typed, confirmPhrase);

  return (
    <BottomSheet
      visible={visible && outcome === null}
      onRequestClose={() => close('cancel')}
      onClosed={() => {
        setOutcome(null);
        if (outcome === 'confirm') onConfirm();
        else onCancel();
      }}>
      <SheetHeader title={title} message={message} />
      {children}
      {confirmPhrase !== undefined ? (
        <TypedConfirmation phrase={confirmPhrase} value={typed} onChange={setTyped} />
      ) : null}
      <SheetActions>
        <Button
          label={confirmLabel}
          variant={destructive ? 'danger' : 'primary'}
          disabled={!confirmed}
          onPress={() => close('confirm')}
        />
        <Button label="Cancel" variant="secondary" onPress={() => close('cancel')} />
      </SheetActions>
    </BottomSheet>
  );
}
