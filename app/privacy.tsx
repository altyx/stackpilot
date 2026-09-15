import { LegalDocumentView } from '../src/components/LegalDocumentView';
import { PRIVACY } from '../src/legal/privacy';

/** Politique de confidentialité, consultable avec ou sans session. */
export default function PrivacyScreen() {
  return <LegalDocumentView document={PRIVACY} />;
}
