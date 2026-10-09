import { useState } from 'react';
import type { PortainerStack } from '../api/types';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { SheetActions } from './SheetActions';
import { SheetHeader } from './SheetHeader';
import { useLatched } from './useLatched';

type Step = 'choose' | 'redeploy' | 'pull';
type Outcome = 'redeploy' | 'pull' | 'cancel';

/**
 * Choosing then confirming a redeploy in a single sheet, like the start/stop
 * actions. A Git stack fetches its branch first; any stack can pull its
 * images again, the usual way to pick up a new `latest`.
 */
export function StackRedeploySheet({
  stack,
  onConfirm,
  onClose,
}: {
  /** Stack to redeploy, or null to close the sheet. */
  stack: PortainerStack | null;
  /** Called after the sheet has fully closed, so the progress can show. */
  onConfirm: (stack: PortainerStack, pullImages: boolean) => void;
  onClose: () => void;
}) {
  const shown = useLatched(stack);
  const [step, setStep] = useState<Step>('choose');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const close = (next: Outcome) => setOutcome((current) => current ?? next);

  // Every opening starts back at the choice.
  const openedId = stack?.Id ?? null;
  const [lastOpenedId, setLastOpenedId] = useState(openedId);
  if (openedId !== lastOpenedId) {
    setLastOpenedId(openedId);
    if (openedId !== null) setStep('choose');
  }

  if (!shown) return null;
  const git = shown.GitConfig;

  return (
    <BottomSheet
      visible={stack !== null && outcome === null}
      onRequestClose={() => close('cancel')}
      onClosed={() => {
        const finished = outcome;
        setOutcome(null);
        if (finished && finished !== 'cancel') onConfirm(shown, finished === 'pull');
        onClose();
      }}>
      {step === 'choose' ? (
        <>
          <SheetHeader
            title={`Redeploy ${shown.Name}`}
            message={
              git
                ? `Fetches the latest version of ${branchName(git.ReferenceName)}, then recreates the services that changed.`
                : 'Recreates the services from the compose file stored in Portainer.'
            }
          />
          <SheetActions>
            <Button
              label={git ? 'Update from Git' : 'Redeploy'}
              variant="secondary"
              onPress={() => setStep('redeploy')}
            />
            <Button
              label={git ? 'From Git, with the latest images' : 'Pull images and redeploy'}
              variant="secondary"
              onPress={() => setStep('pull')}
            />
            <Button label="Cancel" variant="secondary" onPress={() => close('cancel')} />
          </SheetActions>
        </>
      ) : (
        <>
          <SheetHeader
            title={`Redeploy ${shown.Name}?`}
            message={describeImpact(step === 'pull')}
          />
          <SheetActions>
            <Button label="Redeploy" onPress={() => close(step)} />
            <Button label="Back" variant="secondary" onPress={() => setStep('choose')} />
          </SheetActions>
        </>
      )}
    </BottomSheet>
  );
}

function branchName(reference: string): string {
  return reference.replace(/^refs\/(heads|tags)\//, '') || 'the tracked branch';
}

function describeImpact(pullImages: boolean): string {
  return (
    'The affected containers will be recreated: the service is briefly interrupted, and ' +
    'anything not in a volume is lost.' +
    (pullImages ? ' Pulling images can take several minutes.' : '')
  );
}
