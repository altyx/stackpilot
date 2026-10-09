import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import type { VolumePruneScope, VolumeSummary } from '../api/types';
import { formatBytes } from '../lib/format';
import { volumePruneCandidates, type Usage } from '../lib/usage';
import { theme } from '../theme';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { SheetActions } from './SheetActions';
import { SheetHeader } from './SheetHeader';
import { matchesPhrase, TypedConfirmation } from './TypedConfirmation';
import { VolumePruneList } from './VolumePruneList';

type Step = 'choose' | VolumePruneScope;
type Outcome = VolumePruneScope | 'cancel';

const CONFIRM_PHRASE = 'delete';

const SCOPE_LABELS: Record<VolumePruneScope, string> = {
  anonymous: 'Anonymous volumes',
  all: 'All unused volumes',
};

/**
 * Choosing then confirming a volume cleanup, like the image one, with more
 * guards: deleted volumes are lost data. The confirmation lists what goes and
 * waits for a typed word.
 */
export function VolumePruneSheet({
  visible,
  usages,
  sizes,
  anonymousScopeAvailable,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  usages: Usage<VolumeSummary>[];
  sizes: Map<string, number>;
  /** False on engines older than 23, whose default prune also takes named volumes. */
  anonymousScopeAvailable: boolean;
  /** Called after the sheet has fully closed, so the report can display. */
  onConfirm: (scope: VolumePruneScope) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>('choose');
  const [typed, setTyped] = useState('');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const close = (next: Outcome) => setOutcome((current) => current ?? next);

  // Every opening starts back at choosing the scope, with an empty field.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setStep('choose');
      setTyped('');
    }
  }

  const anonymous = volumePruneCandidates(usages, 'anonymous');
  const all = volumePruneCandidates(usages, 'all');
  const total = (volumes: VolumeSummary[]) =>
    volumes.reduce((sum, volume) => sum + (sizes.get(volume.Name) ?? 0), 0);

  function describeOption(scope: VolumePruneScope, volumes: VolumeSummary[]): string {
    if (volumes.length === 0) return `${SCOPE_LABELS[scope]} · none`;
    const size = total(volumes);
    return `${SCOPE_LABELS[scope]} · ${volumes.length}${size > 0 ? ` · ${formatBytes(size)}` : ''}`;
  }

  const candidates = step === 'anonymous' ? anonymous : all;

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
            title="Clean up volumes"
            message="Only volumes that no container uses, even a stopped one, are deleted. Their data is lost for good."
          />
          <SheetActions>
            {anonymousScopeAvailable ? (
              <Button
                label={describeOption('anonymous', anonymous)}
                variant="secondary"
                disabled={anonymous.length === 0}
                onPress={() => setStep('anonymous')}
              />
            ) : null}
            <Button
              label={describeOption('all', all)}
              variant="secondary"
              disabled={all.length === 0}
              onPress={() => setStep('all')}
            />
            <Button label="Cancel" variant="secondary" onPress={() => close('cancel')} />
          </SheetActions>
          {!anonymousScopeAvailable ? (
            <Text style={styles.note}>
              This Docker engine, older than version 23, cannot limit the cleanup to anonymous
              volumes: only the full cleanup is offered.
            </Text>
          ) : null}
        </>
      ) : (
        <>
          <SheetHeader
            title={
              candidates.length > 1 ? `Delete ${candidates.length} volumes?` : 'Delete volume?'
            }
            message={
              step === 'anonymous'
                ? 'Unused anonymous volumes and their data will be permanently deleted.'
                : 'All unused volumes, named ones included, will be deleted along with their data. There is no way to recover it.'
            }
          />
          <VolumePruneList volumes={candidates} sizes={sizes} />
          <TypedConfirmation phrase={CONFIRM_PHRASE} value={typed} onChange={setTyped} />
          <SheetActions>
            <Button
              label="Delete permanently"
              variant="danger"
              disabled={!matchesPhrase(typed, CONFIRM_PHRASE)}
              onPress={() => close(step)}
            />
            <Button label="Back" variant="secondary" onPress={() => setStep('choose')} />
          </SheetActions>
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  note: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17 },
});
