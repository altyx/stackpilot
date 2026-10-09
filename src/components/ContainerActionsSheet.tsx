import { useState, type ComponentProps } from 'react';
import type { SecondaryAction } from '../lib/containerActions';
import { ActionRow } from './ActionRow';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { SheetActions } from './SheetActions';
import { SheetHeader } from './SheetHeader';

const ROWS: Record<
  SecondaryAction,
  Pick<ComponentProps<typeof ActionRow>, 'icon' | 'label' | 'hint' | 'tone'>
> = {
  pause: {
    icon: 'pause-outline',
    label: 'Pause',
    hint: 'Freezes its processes without stopping them: it stops responding until resumed.',
  },
  unpause: {
    icon: 'play-outline',
    label: 'Resume',
    hint: 'Restarts its processes where they were frozen.',
  },
  kill: {
    icon: 'flash-outline',
    label: 'Kill',
    hint: 'Stops it at once, without letting the application shut down cleanly.',
    tone: 'danger',
  },
  remove: {
    icon: 'trash-outline',
    label: 'Delete container',
    hint: 'Its named volumes are kept.',
    tone: 'danger',
  },
};

/**
 * The container's less frequent actions, behind the header's "more" button.
 * The choice is reported once the sheet has closed, so a confirmation sheet
 * can follow: iOS won't present one while another is retracting.
 */
export function ContainerActionsSheet({
  visible,
  name,
  actions,
  onChoose,
  onClose,
}: {
  visible: boolean;
  name: string;
  actions: SecondaryAction[];
  onChoose: (action: SecondaryAction) => void;
  onClose: () => void;
}) {
  const [outcome, setOutcome] = useState<SecondaryAction | 'cancel' | null>(null);
  const close = (next: SecondaryAction | 'cancel') => setOutcome((current) => current ?? next);

  return (
    <BottomSheet
      visible={visible && outcome === null}
      onRequestClose={() => close('cancel')}
      onClosed={() => {
        const finished = outcome;
        setOutcome(null);
        onClose();
        if (finished && finished !== 'cancel') onChoose(finished);
      }}>
      <SheetHeader title={name} />
      {actions.map((action) => (
        <ActionRow key={action} {...ROWS[action]} onPress={() => close(action)} />
      ))}
      <SheetActions>
        <Button label="Cancel" variant="secondary" onPress={() => close('cancel')} />
      </SheetActions>
    </BottomSheet>
  );
}
