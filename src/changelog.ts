/**
 * Notes de version affichées dans Réglages › Nouveautés.
 *
 * L'entrée en tête doit porter la version d'`app.json` : `npm run changelog`
 * le vérifie, et le workflow de publication refuse de compiler sinon. Le
 * changelog s'écrit donc **avant** de bumper la version et de poser le tag,
 * puisque c'est le binaire compilé qui l'embarque.
 *
 * Les lignes décrivent ce que l'utilisateur voit changer, pas le détail
 * technique : celui-ci vit dans l'historique Git.
 */
export interface Release {
  /** Version au format `X.Y.Z`, identique à `app.json`. */
  version: string;
  /** Date de publication, dans le même format que les textes légaux. */
  date: string;
  changes: string[];
}

export const CHANGELOG: readonly Release[] = [
  {
    version: '0.2.1',
    date: '16 septembre 2026',
    changes: [
      'Ajout d\'une page settings applicatif',
    ],
  },
];

/** Version décrite en tête du changelog, celle que l'application embarque. */
export const LATEST_RELEASE: Release = CHANGELOG[0];
