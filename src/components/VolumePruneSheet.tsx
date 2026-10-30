import { useState } from 'react';
import { Text } from 'react-native';
import type { VolumePruneScope, VolumeSummary } from '../api/types';
import { useTranslation } from 'react-i18next';
import { volumePruneCandidates, type Usage } from '../lib/usage';
import { createStyles } from '../theme';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { SheetActions } from './SheetActions';
import { SheetHeader } from './SheetHeader';
import { matchesPhrase, TypedConfirmation } from './TypedConfirmation';
import { VolumePruneList } from './VolumePruneList';
import { useFormat } from '../i18n/format';

type Step = 'choose' | VolumePruneScope;
type Outcome = VolumePruneScope | 'cancel';

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
  const styles = useStyles();
  const { t } = useTranslation();
  const f = useFormat();
  const confirmWord = t('volumes.confirmWord');
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
    const size = total(volumes);
    const label = t(`volumes.scopes.${scope}`);
    if (volumes.length === 0) return `${label} · ${t('volumes.none')}`;
    return `${label} · ${volumes.length}${size > 0 ? ` · ${f.bytes(size)}` : ''}`;
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
          <SheetHeader title={t('volumes.cleanUp')} message={t('volumes.pruneMessage')} />
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
            <Button
              label={t('common.cancel')}
              variant="secondary"
              onPress={() => close('cancel')}
            />
          </SheetActions>
          {!anonymousScopeAvailable ? (
            <Text style={styles.note}>{t('volumes.oldEngine')}</Text>
          ) : null}
        </>
      ) : (
        <>
          <SheetHeader
            title={t('volumes.pruneTitle', { count: candidates.length })}
            message={t(`volumes.pruneImpact.${step}`)}
          />
          <VolumePruneList volumes={candidates} sizes={sizes} />
          <TypedConfirmation phrase={confirmWord} value={typed} onChange={setTyped} />
          <SheetActions>
            <Button
              label={t('volumes.deletePermanently')}
              variant="danger"
              disabled={!matchesPhrase(typed, confirmWord)}
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

const useStyles = createStyles((theme) => ({
  note: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17 },
}));
