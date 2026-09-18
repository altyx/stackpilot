import { LegalDocumentView } from '../src/components/LegalDocumentView';
import { PRIVACY } from '../src/legal/privacy';

/** Privacy policy, readable with or without a session. */
export default function PrivacyScreen() {
  return <LegalDocumentView document={PRIVACY} />;
}
