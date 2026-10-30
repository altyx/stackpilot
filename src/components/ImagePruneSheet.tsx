import { useState } from 'react';
import type { ImagePruneScope, ImageSummary } from '../api/types';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { pruneCandidates, type Usage } from '../lib/usage';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { ImagePruneList } from './ImagePruneList';
import { SheetActions } from './SheetActions';
import { SheetHeader } from './SheetHeader';
import { useFormat, type Formatters } from '../i18n/format';

type Step = 'choose' | ImagePruneScope;
type Outcome = ImagePruneScope | 'cancel';

/**
 * Choosing then confirming an image cleanup, in a single sheet, like the
 * stack actions. The preview is computed from the list on screen; Docker
 * makes the final call on what is unused.
 */
export function ImagePruneSheet({
  visible,
  usages,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  usages: Usage<ImageSummary>[];
  /** Called after the sheet has fully closed, so the report can display. */
  onConfirm: (scope: ImagePruneScope) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>('choose');
  const { t } = useTranslation();
  const f = useFormat();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const close = (next: Outcome) => setOutcome((current) => current ?? next);

  // Every opening starts back at choosing the scope.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setStep('choose');
  }

  const dangling = pruneCandidates(usages, 'dangling');
  const unused = pruneCandidates(usages, 'unused');

  return (
    <BottomSheet
      visible={visible && outcome === null}
      onRequestClose={() => close('cancel')}
      onClosed={() => {
        const finished = outcome;
        setOutcome(null);
        if (finished && finished !== 'cancel') onConfirm(finished);
        onClose();
      }}>
      {step === 'choose' ? (
        <>
          <SheetHeader title={t('images.cleanUp')} message={t('images.pruneMessage')} />
          <SheetActions>
            <Button
              label={describeOption(t, f, 'dangling', dangling)}
              variant="secondary"
              disabled={dangling.length === 0}
              onPress={() => setStep('dangling')}
            />
            <Button
              label={describeOption(t, f, 'unused', unused)}
              variant="secondary"
              disabled={unused.length === 0}
              onPress={() => setStep('unused')}
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
            title={t('images.pruneTitle', {
              count: (step === 'dangling' ? dangling : unused).length,
            })}
            message={t(`images.pruneImpacts.${step}`)}
          />
          <ImagePruneList images={step === 'dangling' ? dangling : unused} />
          <SheetActions>
            <Button label={t('images.pruneConfirm')} variant="danger" onPress={() => close(step)} />
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

function totalSize(images: ImageSummary[]): number {
  return images.reduce((total, image) => total + image.Size, 0);
}

/** What an option targets, how many, how big. */
function describeOption(
  t: TFunction,
  f: Formatters,
  scope: ImagePruneScope,
  images: ImageSummary[],
): string {
  const label = t(`images.scopes.${scope}`);
  if (images.length === 0) return `${label} · ${t('images.none')}`;
  return `${label} · ${images.length} · ${f.bytes(totalSize(images))}`;
}
