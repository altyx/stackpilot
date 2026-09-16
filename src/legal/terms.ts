import type { LegalDocument } from './document';
import { PRIVACY_POLICY_URL, PUBLISHER, SOURCE_CODE_URL } from './publisher';

/**
 * Conditions générales d'utilisation.
 *
 * Le texte décrit le fonctionnement réel de l'application : connexion directe à
 * l'instance, jetons dans le trousseau, notifications relayées par Expo. Toute
 * évolution de ces points doit s'y refléter, avec une nouvelle date.
 */
export const TERMS: LegalDocument = {
  title: "Conditions générales d'utilisation",
  updatedAt: '15 septembre 2026',
  intro:
    "Les présentes conditions générales d'utilisation (les « CGU ») encadrent l'utilisation de l'application mobile StackPilot (l'« Application »). En utilisant l'Application, vous acceptez les CGU dans leur intégralité ; si vous ne les acceptez pas, n'utilisez pas l'Application.",
  sections: [
    {
      title: 'Éditeur',
      body: [
        `L'Application est éditée par ${PUBLISHER.name} (${PUBLISHER.legalStatus}).`,
        `Directeur de la publication : ${PUBLISHER.publicationDirector}.`,
        `Contact : ${PUBLISHER.email}.`,
        "L'Application est distribuée par l'App Store d'Apple et par Google Play. Elle ne s'appuie sur aucun serveur exploité par l'éditeur.",
      ],
    },
    {
      title: "Objet de l'Application",
      body: [
        "StackPilot est un client mobile pour Portainer, l'outil d'administration de conteneurs. Elle permet de consulter les environnements Docker d'une instance Portainer à laquelle vous avez accès (conteneurs, stacks, images, volumes, journaux) et d'y agir, notamment en démarrant, arrêtant ou redémarrant des conteneurs et des stacks.",
        "L'Application est un projet indépendant : elle n'est ni éditée, ni affiliée, ni approuvée par Portainer.io ou Docker, Inc. « Portainer » et « Docker » sont des marques de leurs titulaires respectifs.",
      ],
    },
    {
      title: "Accès à l'Application",
      body: [
        "L'Application est proposée gratuitement. Son utilisation suppose de disposer d'une instance Portainer et d'identifiants valides : un access token, ou un nom d'utilisateur et un mot de passe.",
        "Vous vous engagez à ne connecter l'Application qu'à des instances que vous administrez ou pour lesquelles vous avez reçu une autorisation. Accéder ou se maintenir frauduleusement dans un système informatique, ou en entraver le fonctionnement, est puni par les articles 323-1 et suivants du Code pénal.",
        'Les fonctionnalités disponibles dépendent de la version de votre instance et des droits de votre compte Portainer. Les environnements Kubernetes ne sont pas pris en charge.',
      ],
    },
    {
      title: 'Fonctionnement et sécurité',
      body: [
        "L'Application communique directement avec l'instance Portainer dont vous saisissez l'adresse : vos données ne transitent par aucun serveur de l'éditeur.",
        "Votre access token, ou le jeton de session obtenu avec votre mot de passe, est conservé dans le trousseau sécurisé de l'appareil (Keychain sur iOS, Keystore sur Android). Le mot de passe lui-même n'est jamais enregistré.",
        "Les actions déclenchées depuis l'Application s'exécutent avec les droits du compte Portainer utilisé ; l'Application ne permet pas de les dépasser.",
        "Il vous appartient de protéger l'accès à votre instance : connexion chiffrée (HTTPS), jetons limités aux droits nécessaires, révocation des jetons inutilisés.",
      ],
    },
    {
      title: 'Vos responsabilités',
      body: [
        'Vous êtes responsable :',
        [
          'de la sécurité de votre appareil (code de verrouillage, mises à jour du système) et de la confidentialité de vos identifiants ;',
          "des actions effectuées depuis l'Application : démarrer, arrêter ou redémarrer un conteneur ou une stack peut interrompre les services qui en dépendent ;",
          "de la configuration, de la sécurité et des sauvegardes de votre instance Portainer et des services qu'elle gère ;",
          'du service de surveillance que vous déployez pour recevoir des notifications.',
        ],
        "Les actions sur une stack s'appliquent conteneur par conteneur, sans tenir compte de l'ordre de dépendance entre ses services. Lorsque cet ordre compte, agissez sur chaque conteneur séparément.",
        "En cas de perte ou de vol de votre appareil, révoquez sans délai, depuis Portainer, le token d'accès utilisé par l'Application, ou changez votre mot de passe si vous vous connectiez avec celui-ci.",
      ],
    },
    {
      title: 'Notifications',
      body: [
        "Les notifications sont facultatives. Elles reposent sur un service de surveillance que vous déployez vous-même sur votre infrastructure : il observe les événements Docker et envoie les alertes à votre appareil par le service de notifications d'Expo, puis par Apple Push Notification service (iOS) ou Firebase Cloud Messaging (Android).",
        "Le contenu d'une alerte (nom du conteneur, motif de l'alerte, identifiants de l'environnement et du conteneur) transite par ces prestataires, dans les conditions qui leur sont propres.",
        "L'éditeur n'exploite aucun de ces services et ne garantit ni la réception ni le délai des alertes. Ne faites pas de l'Application votre unique moyen de supervision de services critiques.",
      ],
    },
    {
      title: 'Données personnelles',
      body: [
        "L'éditeur ne collecte aucune donnée personnelle par l'intermédiaire de l'Application : elle ne nécessite pas de compte StackPilot et ne contient ni mesure d'audience, ni publicité.",
        `Les données qu'utilise l'Application, leur conservation et vos droits sont décrits dans la politique de confidentialité, consultable dans l'Application et à l'adresse ${PRIVACY_POLICY_URL}.`,
      ],
    },
    {
      title: 'Propriété intellectuelle',
      body: [
        `Le code source de l'Application est publié sous licence MIT, qui en fixe les conditions de réutilisation : ${SOURCE_CODE_URL}.`,
        "Le nom « StackPilot » et le logo de l'Application restent la propriété de l'éditeur.",
      ],
    },
    {
      title: 'Disponibilité et garanties',
      body: [
        "L'Application est fournie gratuitement et « en l'état ». L'éditeur s'efforce d'en assurer le bon fonctionnement, sans garantir qu'elle soit exempte d'erreurs, compatible avec toutes les versions de Portainer ou disponible en permanence.",
        "L'éditeur peut à tout moment faire évoluer l'Application, en suspendre la distribution ou y mettre fin.",
      ],
    },
    {
      title: 'Responsabilité',
      body: [
        "Dans les limites autorisées par la loi, l'éditeur ne peut être tenu responsable des dommages résultant :",
        [
          "d'une action effectuée depuis l'Application ;",
          "d'une erreur ou d'une indisponibilité de l'Application, de votre instance Portainer ou des services tiers mentionnés dans les CGU ;",
          "d'une alerte non reçue ou reçue en retard ;",
          "d'un accès d'un tiers à votre appareil ou à vos identifiants.",
        ],
        "Ces limitations ne s'appliquent pas lorsque la loi interdit de restreindre la responsabilité de l'éditeur.",
      ],
    },
    {
      title: 'Modification des CGU',
      body: [
        "L'éditeur peut modifier les CGU, notamment pour tenir compte des évolutions de l'Application ou de la réglementation. La date de dernière mise à jour figure en tête du document. Continuer à utiliser l'Application après une modification vaut acceptation de la nouvelle version.",
      ],
    },
    {
      title: 'Durée',
      body: [
        "Les CGU s'appliquent pendant toute la durée d'utilisation de l'Application. Vous pouvez y mettre fin à tout moment : déconnectez-vous, désinstallez l'Application et révoquez depuis Portainer les access tokens créés pour elle.",
      ],
    },
    {
      title: 'Droit applicable et litiges',
      body: [
        "Les CGU sont régies par le droit français. En cas de litige, contactez d'abord l'éditeur afin de rechercher une solution amiable. À défaut, le litige sera porté devant les juridictions compétentes selon les règles de droit commun.",
      ],
    },
  ],
};
