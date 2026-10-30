import { useState } from 'react';
import type { PortainerStack } from '../api/types';
import { useStrings } from '../i18n';
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
  const t = useStrings();
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
            title={t.stack.redeployTitle(shown.Name)}
            message={
              git
                ? t.stack.redeployGit(branchName(git.ReferenceName) || t.stack.trackedBranch)
                : t.stack.redeployFile
            }
          />
          <SheetActions>
            <Button
              label={git ? t.stack.updateFromGit : t.stack.redeploy}
              variant="secondary"
              onPress={() => setStep('redeploy')}
            />
            <Button
              label={git ? t.stack.gitWithImages : t.stack.pullAndRedeploy}
              variant="secondary"
              onPress={() => setStep('pull')}
            />
            <Button label={t.common.cancel} variant="secondary" onPress={() => close('cancel')} />
          </SheetActions>
        </>
      ) : (
        <>
          <SheetHeader
            title={t.stack.redeployConfirmTitle(shown.Name)}
            message={t.stack.redeployImpact(step === 'pull')}
          />
          <SheetActions>
            <Button label={t.stack.redeploy} onPress={() => close(step)} />
            <Button label={t.common.back} variant="secondary" onPress={() => setStep('choose')} />
          </SheetActions>
        </>
      )}
    </BottomSheet>
  );
}

function branchName(reference: string): string {
  return reference.replace(/^refs\/(heads|tags)\//, '');
}
