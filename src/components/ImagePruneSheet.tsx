import { useState } from 'react';
import type { ImagePruneScope, ImageSummary } from '../api/types';
import { formatBytes } from '../lib/format';
import { pruneCandidates, type Usage } from '../lib/usage';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { ImagePruneList } from './ImagePruneList';
import { SheetActions } from './SheetActions';
import { SheetHeader } from './SheetHeader';

type Step = 'choose' | ImagePruneScope;
type Outcome = ImagePruneScope | 'cancel';

const SCOPE_LABELS: Record<ImagePruneScope, string> = {
  dangling: 'Images sans tag',
  unused: 'Toutes les images inutilisées',
};

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
          <SheetHeader
            title="Nettoyer les images"
            message="Seules les images qu'aucun conteneur n'utilise, même arrêté, sont supprimées."
          />
          <SheetActions>
            <Button
              label={describeOption('dangling', dangling)}
              variant="secondary"
              disabled={dangling.length === 0}
              onPress={() => setStep('dangling')}
            />
            <Button
              label={describeOption('unused', unused)}
              variant="secondary"
              disabled={unused.length === 0}
              onPress={() => setStep('unused')}
            />
            <Button label="Annuler" variant="secondary" onPress={() => close('cancel')} />
          </SheetActions>
        </>
      ) : (
        <>
          <SheetHeader
            title={describeTitle(step === 'dangling' ? dangling : unused)}
            message={describeImpact(step)}
          />
          <ImagePruneList images={step === 'dangling' ? dangling : unused} />
          <SheetActions>
            <Button label="Nettoyer" variant="danger" onPress={() => close(step)} />
            <Button label="Retour" variant="secondary" onPress={() => setStep('choose')} />
          </SheetActions>
        </>
      )}
    </BottomSheet>
  );
}

function totalSize(images: ImageSummary[]): number {
  return images.reduce((total, image) => total + image.Size, 0);
}

function describeOption(scope: ImagePruneScope, images: ImageSummary[]): string {
  if (images.length === 0) return `${SCOPE_LABELS[scope]} · aucune`;
  return `${SCOPE_LABELS[scope]} · ${images.length} · ${formatBytes(totalSize(images))}`;
}

function describeTitle(images: ImageSummary[]): string {
  return images.length > 1 ? `Supprimer ${images.length} images ?` : "Supprimer l'image ?";
}

function describeImpact(scope: ImagePruneScope): string {
  return scope === 'dangling'
    ? 'Les images sans tag, restes de builds ou de mises à jour, seront supprimées.'
    : 'Toutes les images inutilisées seront supprimées, y compris celles portant un tag. ' +
        'Il faudra les retélécharger pour recréer un conteneur à partir de celles-ci.';
}
