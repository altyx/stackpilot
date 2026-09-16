import { LegalDocumentView } from '../../../src/components/LegalDocumentView';
import { PRIVACY } from '../../../src/legal/privacy';

/**
 * Politique de confidentialité ouverte depuis le menu. Hors session, c'est
 * `app/privacy.tsx` qui la sert.
 */
export default function DrawerPrivacyScreen() {
  return <LegalDocumentView document={PRIVACY} />;
}
