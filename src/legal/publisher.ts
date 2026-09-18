/**
 * Publisher identity, reused by the app's legal texts.
 *
 * Each value left to fill in displays as-is in the app. The publish workflow
 * refuses to build a production version while one remains in `src/legal`.
 */
export const PUBLISHER = {
  /** First and last name, or company name. */
  name: 'Moutawakil Samir',
  /** "Particulier" (individual), "Entrepreneur individuel, SIREN …" or "SAS au capital de … €, RCS …" — the French legal-status wording, as it must appear in a French legal document. */
  legalStatus: 'Particulier',
  address: '',
  /** Address users can write to. */
  email: 'samir@altyxlab.fr',
  /** Usually the publisher themselves. */
  publicationDirector: 'Samir Moutawakil',
} as const;

export const SOURCE_CODE_URL = 'https://github.com/altyx/stackpilot';

/**
 * Public version of the privacy policy, generated into `docs/legal` by
 * `npm run legal`. This is the address to declare in the stores: it points
 * to `main`, so the file must be merged there.
 */
export const PRIVACY_POLICY_URL = `${SOURCE_CODE_URL}/blob/main/docs/legal/privacy.md`;
