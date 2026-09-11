import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { StackAction } from '../api/types';
import { containerName } from '../lib/format';
import type { StackSection } from '../lib/stacks';
import { theme } from '../theme';
import { BottomSheet, SheetActions, SheetHeader, useLatched } from './BottomSheet';
import { Button, StatusDot } from './ui';

/** Au-delà, la liste des conteneurs est résumée pour garder la feuille compacte. */
const MAX_LISTED = 6;

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
          <MemberList section={shown} />
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

function MemberList({ section }: { section: StackSection }) {
  const listed = section.members.slice(0, MAX_LISTED);
  const hidden = section.members.length - listed.length;
  return (
    <View style={styles.members}>
      {listed.map((container) => (
        <View key={container.Id} style={styles.member}>
          <StatusDot state={container.State} />
          <Text style={styles.memberName} numberOfLines={1}>
            {containerName(container)}
          </Text>
        </View>
      ))}
      {hidden > 0 ? (
        <Text style={styles.more}>
          et {hidden} autre{hidden > 1 ? 's' : ''}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  members: {
    backgroundColor: theme.colors.bg,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(3),
    gap: theme.spacing(2),
  },
  member: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2) },
  memberName: { color: theme.colors.text, fontSize: 14, flex: 1 },
  more: { color: theme.colors.textMuted, fontSize: 13 },
});
