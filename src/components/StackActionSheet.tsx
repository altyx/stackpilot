import { useState } from 'react';
import type { StackAction } from '../api/types';
import { plural } from '../lib/format';
import type { StackSection } from '../lib/stacks';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { SheetActions } from './SheetActions';
import { SheetHeader } from './SheetHeader';
import { StackMemberList } from './StackMemberList';
import { useLatched } from './useLatched';

type Step = 'choose' | StackAction;
type Outcome = StackAction | 'cancel';

/**
 * Choosing then confirming a stack action, in a single sheet: moving from one
 * step to the next changes the content without closing and reopening the modal.
 */
export function StackActionSheet({
  section,
  onConfirm,
  onClose,
}: {
  /** Targeted stack, or null to close the sheet. */
  section: StackSection | null;
  /** Called after the sheet has fully closed, so the report can display. */
  onConfirm: (section: StackSection, action: StackAction) => void;
  onClose: () => void;
}) {
  const shown = useLatched(section);
  const [step, setStep] = useState<Step>('choose');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const close = (next: Outcome) => setOutcome((current) => current ?? next);

  // Every opening starts back at choosing the action.
  const openedKey = section?.key ?? null;
  const [lastOpenedKey, setLastOpenedKey] = useState(openedKey);
  if (openedKey !== lastOpenedKey) {
    setLastOpenedKey(openedKey);
    if (openedKey !== null) setStep('choose');
  }

  if (!shown) return null;

  const total = shown.members.length;

  return (
    <BottomSheet
      visible={section !== null && outcome === null}
      onRequestClose={() => close('cancel')}
      onClosed={() => {
        const finished = outcome;
        setOutcome(null);
        if (finished && finished !== 'cancel') onConfirm(shown, finished);
        onClose();
      }}>
      {step === 'choose' ? (
        <>
          <SheetHeader
            title={shown.title}
            message={`${shown.running}/${total} running · ${plural(total, 'container')}`}
          />
          <SheetActions>
            <Button label="Start stack" onPress={() => setStep('start')} />
            <Button label="Stop stack" variant="danger" onPress={() => setStep('stop')} />
            <Button label="Cancel" variant="secondary" onPress={() => close('cancel')} />
          </SheetActions>
        </>
      ) : (
        <>
          <SheetHeader
            title={step === 'start' ? 'Start stack?' : 'Stop stack?'}
            message={describeImpact(shown, step)}
          />
          <StackMemberList section={shown} />
          <SheetActions>
            <Button
              label={step === 'start' ? 'Start' : 'Stop'}
              variant={step === 'stop' ? 'danger' : 'primary'}
              onPress={() => close(step)}
            />
            <Button label="Back" variant="secondary" onPress={() => setStep('choose')} />
          </SheetActions>
        </>
      )}
    </BottomSheet>
  );
}

function describeImpact(section: StackSection, action: StackAction): string {
  const total = section.members.length;
  const verb = action === 'start' ? 'started' : 'stopped';
  return total > 1
    ? `All ${total} containers of the ${section.title} stack will be ${verb}, including those hidden by a filter.`
    : `The container of the ${section.title} stack will be ${verb}.`;
}
