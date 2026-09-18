import { useEffect, useState } from 'react';
import type { StackAction } from '../api/types';
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
 * Choix puis confirmation d'une action de stack, dans une seule feuille : passer
 * d'une étape à l'autre change le contenu sans refermer ni rouvrir la modale.
 */
export function StackActionSheet({
  section,
  onConfirm,
  onClose,
}: {
  /** Stack ciblée, ou null pour fermer la feuille. */
  section: StackSection | null;
  /** Appelé après la fermeture complète, pour que le compte rendu puisse s'afficher. */
  onConfirm: (section: StackSection, action: StackAction) => void;
  onClose: () => void;
}) {
  const shown = useLatched(section);
  const [step, setStep] = useState<Step>('choose');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const close = (next: Outcome) => setOutcome((current) => current ?? next);

  // Chaque ouverture repart du choix de l'action.
  const openedKey = section?.key ?? null;
  useEffect(() => {
    if (openedKey !== null) setStep('choose');
  }, [openedKey]);

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
            message={`${shown.running}/${total} en cours · ${total} conteneur${total > 1 ? 's' : ''}`}
          />
          <SheetActions>
            <Button label="Démarrer la stack" onPress={() => setStep('start')} />
            <Button label="Arrêter la stack" variant="danger" onPress={() => setStep('stop')} />
            <Button label="Annuler" variant="secondary" onPress={() => close('cancel')} />
          </SheetActions>
        </>
      ) : (
        <>
          <SheetHeader
            title={step === 'start' ? 'Démarrer la stack ?' : 'Arrêter la stack ?'}
            message={describeImpact(shown, step)}
          />
          <StackMemberList section={shown} />
          <SheetActions>
            <Button
              label={step === 'start' ? 'Démarrer' : 'Arrêter'}
              variant={step === 'stop' ? 'danger' : 'primary'}
              onPress={() => close(step)}
            />
            <Button label="Retour" variant="secondary" onPress={() => setStep('choose')} />
          </SheetActions>
        </>
      )}
    </BottomSheet>
  );
}

function describeImpact(section: StackSection, action: StackAction): string {
  const total = section.members.length;
  const verb = action === 'start' ? 'démarré' : 'arrêté';
  return total > 1
    ? `Les ${total} conteneurs de la stack ${section.title} seront ${verb}s, y compris ceux masqués par un filtre.`
    : `Le conteneur de la stack ${section.title} sera ${verb}.`;
}
