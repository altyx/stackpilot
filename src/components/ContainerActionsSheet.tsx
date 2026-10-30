import { useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import type { SecondaryAction } from '../lib/containerActions';
import { ActionRow } from './ActionRow';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { SheetActions } from './SheetActions';
import { SheetHeader } from './SheetHeader';

const ROWS: Record<SecondaryAction, Pick<ComponentProps<typeof ActionRow>, 'icon' | 'tone'>> = {
  pause: { icon: 'pause-outline' },
  unpause: { icon: 'play-outline' },
  kill: { icon: 'flash-outline', tone: 'danger' },
  remove: { icon: 'trash-outline', tone: 'danger' },
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
  const { t } = useTranslation();
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
        <ActionRow
          key={action}
          {...ROWS[action]}
          label={t(`container.menu.${action}.label`)}
          hint={t(`container.menu.${action}.hint`)}
          onPress={() => close(action)}
        />
      ))}
      <SheetActions>
        <Button label={t('common.cancel')} variant="secondary" onPress={() => close('cancel')} />
      </SheetActions>
    </BottomSheet>
  );
}
