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
    version: '0.1.0',
    date: '16 septembre 2026',
    changes: [
      'Première version de StackPilot.',
      "Connexion à une instance Portainer par access token ou par identifiants, avec jeton conservé dans le trousseau sécurisé de l'appareil.",
      'Conteneurs regroupés par stack, avec recherche, filtres et actions sur un conteneur comme sur une stack entière.',
      'Consultation des images et des volumes, avec repérage de ce qui est inutilisé.',
      'Affichage des 200 dernières lignes de journal d’un conteneur.',
      "Alertes par notification, en déployant le service de surveillance fourni sur votre serveur.",
      "Menu latéral pour naviguer entre environnements, conteneurs, images, volumes et réglages.",
    ],
  },
];

/** Version décrite en tête du changelog, celle que l'application embarque. */
export const LATEST_RELEASE: Release = CHANGELOG[0];
