import { useState } from 'react';
import type { StackAction } from '../api/types';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
            message={`${t('common.runningRatio', { running: shown.running, total })} · ${t('counts.container', { count: total })}`}
          />
          <SheetActions>
            <Button label={t('stacks.startStack')} onPress={() => setStep('start')} />
            <Button
              label={t('stacks.stopStack')}
              variant="danger"
              onPress={() => setStep('stop')}
            />
            <Button
              label={t('common.cancel')}
              variant="secondary"
              onPress={() => close('cancel')}
            />
          </SheetActions>
        </>
      ) : (
        <>
          <SheetHeader
            title={t(`stacks.confirmTitles.${step}`)}
            message={t(`stacks.impacts.${step}`, {
              count: shown.members.length,
              title: shown.title,
            })}
          />
          <StackMemberList section={shown} />
          <SheetActions>
            <Button
              label={t(`stacks.actions.${step}`)}
              variant={step === 'stop' ? 'danger' : 'primary'}
              onPress={() => close(step)}
            />
            <Button
              label={t('common.back')}
              variant="secondary"
              onPress={() => setStep('choose')}
            />
          </SheetActions>
        </>
      )}
    </BottomSheet>
  );
}
