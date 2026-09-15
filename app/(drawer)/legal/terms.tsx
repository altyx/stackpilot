import { LegalDocumentView } from '../../../src/components/LegalDocumentView';
import { TERMS } from '../../../src/legal/terms';

/** CGU ouvertes depuis le menu. Hors session, c'est `app/terms.tsx` qui les sert. */
export default function DrawerTermsScreen() {
  return <LegalDocumentView document={TERMS} />;
}
