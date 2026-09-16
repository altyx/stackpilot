/**
 * Identité de l'éditeur, reprise par les textes légaux de l'application.
 *
 * Chaque valeur à compléter s'affiche telle quelle dans l'app. Le workflow
 * de publication refuse de construire une version de production tant qu'il en
 * reste une dans `src/legal`.
 */
export const PUBLISHER = {
  /** Nom et prénom, ou raison sociale. */
  name: 'Moutawakil Samir',
  /** « Particulier », « Entrepreneur individuel, SIREN … » ou « SAS au capital de … €, RCS … ». */
  legalStatus: 'Particulier',
  address: '',
  /** Adresse à laquelle les utilisateurs peuvent écrire. */
  email: 'samir@altyxlab.fr',
  /** En général l'éditeur lui-même. */
  publicationDirector: 'Samir Moutawakil',
} as const;

export const SOURCE_CODE_URL = 'https://github.com/altyx/stackpilot';

/**
 * Version publique de la politique de confidentialité, générée dans
 * `docs/legal` par `npm run legal`. C'est l'adresse à déclarer dans les stores :
 * elle pointe sur `main`, le fichier doit donc y être fusionné.
 */
export const PRIVACY_POLICY_URL = `${SOURCE_CODE_URL}/blob/main/docs/legal/privacy.md`;
