import { LegalDocumentView } from '../src/components/LegalDocumentView';
import { TERMS } from '../src/legal/terms';

/** Terms of use, readable with or without a session: the navigation guard lets them through. */
export default function TermsScreen() {
  return <LegalDocumentView document={TERMS} />;
}
