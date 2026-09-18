import { useState, type ReactNode } from 'react';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { SheetActions } from './SheetActions';
import { SheetHeader } from './SheetHeader';

export interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  destructive?: boolean;
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
  onConfirm,
  onCancel,
  children,
}: ConfirmSheetProps) {
  // Remembers why the sheet is closing: the callback only fires once the animation ends.
  const [outcome, setOutcome] = useState<'confirm' | 'cancel' | null>(null);
  const close = (next: 'confirm' | 'cancel') => setOutcome((current) => current ?? next);

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
      <SheetActions>
        <Button
          label={confirmLabel}
          variant={destructive ? 'danger' : 'primary'}
          onPress={() => close('confirm')}
        />
        <Button label="Annuler" variant="secondary" onPress={() => close('cancel')} />
      </SheetActions>
    </BottomSheet>
  );
}
