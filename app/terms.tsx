import { LegalDocumentView } from '../src/components/LegalDocumentView';
import { TERMS } from '../src/legal/terms';

/** CGU, consultables avec ou sans session : la garde de navigation les laisse passer. */
export default function TermsScreen() {
  return <LegalDocumentView document={TERMS} />;
}
