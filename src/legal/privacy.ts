import type { LegalDocument } from './document';
import { PRIVACY_POLICY_URL, PUBLISHER } from './publisher';

/**
 * Politique de confidentialité.
 *
 * Chaque affirmation correspond au code : ce que `src/auth/storage.ts` garde
 * dans le trousseau, ce que `expo-notifications` envoie à Expo pour obtenir un
 * jeton, ce que le watcher met dans une alerte. Si l'un de ces points change,
 * le texte et sa date doivent suivre.
 */
export const PRIVACY: LegalDocument = {
  title: 'Politique de confidentialité',
  updatedAt: '15 septembre 2026',
  intro:
    "Cette politique explique quelles données l'application mobile StackPilot (l'« Application ») utilise, où elles sont conservées et quels tiers peuvent y avoir accès. En résumé : l'éditeur ne collecte aucune donnée par l'intermédiaire de l'Application, qui communique directement avec votre instance Portainer.",
  sections: [
    {
      title: 'Responsable du traitement',
      body: [
        `Le responsable du traitement est ${PUBLISHER.name} (${PUBLISHER.legalStatus}), ${PUBLISHER.address}, joignable à l'adresse ${PUBLISHER.email}.`,
        "L'éditeur n'exploite aucun serveur pour l'Application : il n'a accès ni à vos identifiants, ni aux données de vos instances Portainer.",
      ],
    },
    {
      title: 'Données conservées sur votre appareil',
      body: [
        "Pour vous connecter, l'Application enregistre dans le trousseau sécurisé de l'appareil (Keychain sur iOS, Keystore sur Android) :",
        [
          "l'adresse de votre instance Portainer et le mode de connexion choisi ;",
          "votre nom d'utilisateur Portainer, si vous vous connectez avec vos identifiants ;",
          "votre access token, ou le jeton de session obtenu avec votre mot de passe. Le mot de passe lui-même n'est jamais enregistré.",
        ],
        "Elle y enregistre aussi l'identifiant du dernier environnement consulté sur cette instance, pour rouvrir l'Application sur ses conteneurs.",
        "Les informations lues sur votre instance (environnements, conteneurs, images, volumes, journaux) sont affichées sans être enregistrées : elles restent en mémoire pendant l'utilisation, et sont effacées à la déconnexion ou à la fermeture de l'Application.",
        "Ces données ne quittent l'appareil que pour être envoyées directement à votre instance Portainer.",
      ],
    },
    {
      title: 'Durée de conservation',
      body: [
        "Le jeton est supprimé à la déconnexion, ou automatiquement dès que votre instance le refuse. L'adresse de l'instance, le mode de connexion et le nom d'utilisateur sont conservés après la déconnexion, pour pré-remplir la connexion suivante ; l'identifiant du dernier environnement consulté l'est aussi, pour rouvrir le même environnement.",
        "Sur Android, la désinstallation de l'Application efface ces informations. Sur iOS, le système peut les conserver dans le trousseau après la désinstallation : elles sont alors retrouvées si vous réinstallez l'Application.",
      ],
    },
    {
      title: 'Notifications',
      body: [
        "Les notifications sont facultatives et ne fonctionnent qu'avec le service de surveillance que vous déployez vous-même sur votre infrastructure.",
        "Lorsque vous les activez, l'Application demande un jeton de notification au service d'Expo. Expo reçoit à cette occasion l'identifiant de notification attribué à l'appareil par Apple ou Google, un identifiant d'installation généré par l'Application et l'identifiant de l'Application. Vous recopiez ensuite ce jeton dans la configuration de votre service de surveillance : l'éditeur ne le reçoit pas.",
        "Pour chaque alerte, votre service de surveillance transmet à Expo le jeton, le nom du conteneur, le motif de l'alerte et les identifiants de l'environnement et du conteneur. Expo relaie l'alerte à Apple Push Notification service (iOS) ou à Firebase Cloud Messaging (Android), qui la délivrent à l'appareil.",
        "Pour ne plus recevoir d'alertes, retirez l'autorisation de notifications dans les réglages de l'appareil, ou retirez le jeton de la configuration du service de surveillance.",
      ],
    },
    {
      title: 'Données communiquées par les stores',
      body: [
        "L'Application est distribuée par l'App Store et par Google Play, dont l'utilisation relève des politiques de confidentialité d'Apple et de Google.",
        "Selon vos réglages de partage, Apple et Google peuvent communiquer à l'éditeur des statistiques d'utilisation agrégées et des rapports de plantage, qui ne permettent pas de vous identifier.",
        "Si vous participez à un test de l'Application (TestFlight ou piste de test Google Play), l'éditeur connaît l'adresse e-mail utilisée pour vous inviter, et reçoit les retours que vous choisissez d'envoyer : commentaires, captures d'écran, rapports de plantage.",
      ],
    },
    {
      title: "Échanges avec l'éditeur",
      body: [
        `Si vous écrivez à ${PUBLISHER.email}, l'éditeur utilise votre adresse e-mail et le contenu de votre message uniquement pour vous répondre, sur la base de son intérêt légitime à traiter vos demandes. Ces échanges sont conservés au plus trois ans après le dernier message.`,
      ],
    },
    {
      title: 'Partage et transferts',
      body: [
        "L'éditeur ne vend ni ne partage aucune donnée. L'Application ne contient ni outil de mesure d'audience, ni publicité.",
        "Les prestataires mentionnés sont établis notamment aux États-Unis : les données qui transitent par eux peuvent être traitées hors de l'Union européenne, dans les conditions prévues par leurs politiques :",
        [
          'Expo : https://expo.dev/privacy',
          'Apple : https://www.apple.com/legal/privacy/',
          'Google : https://policies.google.com/privacy',
        ],
      ],
    },
    {
      title: 'Sécurité',
      body: [
        "Les identifiants sont chiffrés par le trousseau sécurisé du système et ne sont lisibles que par l'Application.",
        "La confidentialité des échanges avec votre instance dépend de sa configuration : privilégiez une connexion chiffrée (HTTPS), et des access tokens limités aux droits nécessaires.",
      ],
    },
    {
      title: 'Vos droits',
      body: [
        "Conformément au règlement général sur la protection des données (RGPD) et à la loi Informatique et Libertés, vous disposez de droits d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité sur les données vous concernant.",
        "Les données de connexion n'étant conservées que sur votre appareil, vous les maîtrisez directement, dans les conditions décrites à la section « Durée de conservation ».",
        `Pour toute autre demande, écrivez à ${PUBLISHER.email}. Vous pouvez aussi introduire une réclamation auprès de la CNIL : https://www.cnil.fr.`,
      ],
    },
    {
      title: 'Modification de la politique',
      body: [
        `L'éditeur peut modifier cette politique, notamment lorsque le fonctionnement de l'Application évolue. La date de dernière mise à jour figure en tête du document. La version en vigueur est consultable dans l'Application et à l'adresse ${PRIVACY_POLICY_URL}.`,
      ],
    },
  ],
};
