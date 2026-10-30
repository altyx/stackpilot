import type { ContainerAction } from '../api/types';
import { CERTIFICATE_HELP_FR } from '../help/certificates';
import { formatBytes, formatDate, formatPercent, pluralFr, type LocaleFormat } from '../lib/format';
import type { Strings } from './en';

// Spaces before ? ! : ; and % are non-breaking, as French typography wants:
// a question mark never wraps onto a line of its own.

const format: LocaleFormat = {
  months: [
    'janv.',
    'févr.',
    'mars',
    'avr.',
    'mai',
    'juin',
    'juil.',
    'août',
    'sept.',
    'oct.',
    'nov.',
    'déc.',
  ],
  dateTime: (day, time) => `${day} à ${time}`,
  decimal: ',',
  byteUnits: ['o', 'ko', 'Mo', 'Go', 'To'],
  percent: (value) => `${value} %`,
};

const CONTAINER_STATES: Record<string, string> = {
  created: 'Créé',
  running: 'En cours',
  paused: 'En pause',
  restarting: 'Redémarrage',
  removing: 'Suppression',
  exited: 'Arrêté',
  dead: 'Mort',
};

const CONTAINER_ACTIONS: Record<ContainerAction, string> = {
  start: 'Démarrer',
  stop: 'Arrêter',
  restart: 'Redémarrer',
  pause: 'Suspendre',
  unpause: 'Reprendre',
  kill: 'Tuer',
};

const containers = (count: number) => pluralFr(count, 'conteneur');
const images = (count: number) => pluralFr(count, 'image');
const volumes = (count: number) => pluralFr(count, 'volume');
const stacks = (count: number) => pluralFr(count, 'stack');
/** Agrees a past participle with a count: "1 conteneur arrêté", "2 conteneurs arrêtés". */
const agreed = (count: number, participle: string) => (count < 2 ? participle : `${participle}s`);

export const fr: Strings = {
  date: (value) => formatDate(value, format),
  bytes: (value) => formatBytes(value, format),
  percent: (value) => formatPercent(value, format),
  containerState: (state) => CONTAINER_STATES[state] ?? state,

  common: {
    cancel: 'Annuler',
    back: 'Retour',
    retry: 'Réessayer',
    close: 'Fermer',
    save: 'Enregistrer',
    edit: 'Modifier',
    delete: 'Supprimer',
    copy: 'Copier',
    copied: 'Copié',
    loading: 'Chargement…',
    unknownError: 'Erreur inconnue.',
    unexpectedError: 'Une erreur inattendue s’est produite.',
    all: 'Tous',
    running: 'En cours',
    stopped: 'Arrêtés',
    used: 'Utilisés',
    unused: 'Inutilisés',
    noMatch: 'Rien ne correspond à ce filtre.',
    noContainers: 'Aucun conteneur',
    andMore: (count) => `et ${count} de plus`,
    show: (name) => `Afficher ${name}`,
    hide: (name) => `Masquer ${name}`,
    deleteNamed: (name) => `Supprimer ${name}`,
    runningRatio: (running, total) => `${running}/${total} en cours`,
    actionFailed: 'Échec de l’action',
    actionNotApplied: 'L’action n’a pas pu être appliquée.',
    deleteFailed: 'Échec de la suppression',
    cleanupComplete: 'Nettoyage terminé',
    cleanupFailed: 'Échec du nettoyage',
    cannotOpenLink: 'Impossible d’ouvrir le lien',
    noAppForLink: 'Aucune app ne peut ouvrir cette adresse.',
    signInAgain: 'Se reconnecter',
    pruneOption: (label, count, size, none) =>
      count === 0 ? `${label} · ${none}` : `${label} · ${count}${size ? ` · ${size}` : ''}`,
    usage: {
      image: { used: (count) => `utilisée · ${count}`, unused: 'inutilisée' },
      volume: { used: (count) => `utilisé · ${count}`, unused: 'inutilisé' },
    },
    typeToConfirm: 'Pour confirmer, tapez ',
    typeToConfirmLabel: (phrase) => `Tapez ${phrase} pour confirmer`,
  },

  nav: {
    openMenu: 'Ouvrir le menu',
    overview: 'Vue d’ensemble',
    containers: 'Conteneurs',
    stacks: 'Stacks',
    images: 'Images',
    volumes: 'Volumes',
    environments: 'Environnements',
    settings: 'Réglages',
    notifications: 'Notifications',
    changelog: 'Nouveautés',
    certificates: 'Certificat HTTPS',
    restoringSession: 'Restauration de la session…',
    noEnvironmentOpen: 'Aucun environnement ouvert',
    environment: 'Environnement',
    signOut: 'Se déconnecter',
  },

  errors: {
    urlRequired: 'L’URL de l’instance est obligatoire.',
    timeout: 'L’instance Portainer n’a pas répondu à temps.',
    refusedOverHttps:
      'Connexion refusée. Si l’instance répond dans un navigateur, la cause est ' +
      'presque toujours son certificat TLS : le système rejette un certificat ' +
      'auto-signé, et l’app n’a aucun moyen de l’accepter.',
    unreachable: 'Impossible de joindre l’instance Portainer. Vérifiez l’URL et le réseau.',
    unauthorized: 'Authentification refusée : jeton invalide ou expiré.',
    forbidden: 'Accès refusé : ce compte n’a pas de droits sur cette ressource.',
    notFound: 'Ressource introuvable sur cette instance.',
    conflict: 'Conflit : la ressource est déjà dans cet état.',
    http: (status) => `Erreur Portainer (HTTP ${status}).`,
    sessionExpired: 'Session expirée. Reconnectez-vous.',
    noSessionToken: 'Portainer a répondu sans jeton de session.',
    invalidEndpoint: (id) => `Identifiant d’environnement invalide (${id}).`,
    imageInUse:
      'Image utilisée : un conteneur, peut-être arrêté, en dépend encore. Supprimez-le d’abord.',
    volumeInUse:
      'Volume utilisé : un conteneur, peut-être arrêté, s’en sert encore. Supprimez-le d’abord.',
    emptyStackFile: 'Le fichier de la stack est vide : Portainer refuserait le redéploiement.',
  },

  login: {
    title: 'Connexion à Portainer',
    subtitle: 'Les identifiants sont conservés dans le trousseau sécurisé de l’appareil.',
    sessionExpired: 'Votre session a expiré. Reconnectez-vous pour continuer.',
    tokenRevoked: 'Portainer a refusé le jeton d’accès : il a probablement été révoqué.',
    instanceUrl: 'URL de l’instance',
    accessToken: 'Jeton d’accès',
    credentials: 'Identifiants',
    username: 'Nom d’utilisateur',
    password: 'Mot de passe',
    showInput: 'Afficher la saisie',
    hideInput: 'Masquer la saisie',
    failed: 'Connexion impossible.',
    fixCertificate: 'Résoudre un problème de certificat',
    submit: 'Se connecter',
    legalBefore: 'En vous connectant, vous acceptez les ',
    legalTerms: 'conditions d’utilisation',
    legalMiddle: '. Voir aussi la ',
    legalPrivacy: 'politique de confidentialité',
    legalAfter: '.',
    apiKeyHint:
      'Créez un jeton d’accès dans Portainer › My account › Access tokens. Il n’expire jamais et se révoque sur le serveur.',
    jwtHint:
      'La connexion par identifiants ouvre une session JWT temporaire ; Portainer y met fin après quelques heures.',
  },

  notifications: {
    registrationFailed: 'Échec de l’inscription',
    copiedMessage: 'Le jeton est dans le presse-papiers.',
    intro:
      'Les alertes sont envoyées par un service qui surveille le flux d’événements Docker de votre serveur. Cet écran fournit le jeton dont ce service a besoin pour joindre cet appareil.',
    tokenTitle: 'Jeton de cet appareil',
    allowToGetToken: 'Autorisez les notifications pour obtenir le jeton de cet appareil.',
    copyToken: 'Copier le jeton',
    denied:
      'Les notifications sont désactivées. Réactivez-les dans les réglages du système, puis inscrivez-vous à nouveau.',
    allow: 'Autoriser les notifications',
    setup: 'Mise en place',
    steps: [
      'Déployez le service watcher/ sur votre serveur (voir son README).',
      'Collez ce jeton dans sa variable EXPO_PUSH_TOKENS.',
      'Le service vous alerte quand un conteneur plante, devient unhealthy, redémarre ou manque de mémoire.',
    ],
    footnote:
      'Les notifications à distance demandent un appareil physique et une version compilée de l’app : elles ne fonctionnent ni dans un simulateur ni dans Expo Go.',
    needsDevice:
      'Les notifications à distance demandent un appareil physique : APNs ne délivre pas de jeton à un simulateur.',
    expoGo:
      'Expo Go ne reçoit pas les notifications à distance. Installez une version compilée de l’app (dev build) pour les activer.',
    noProjectId:
      'Pas de projectId EAS dans la configuration : lancez `eas init`, puis recompilez l’app.',
    channelName: 'Alertes des conteneurs',
    stateChange: 'Changement d’état',
  },

  changelog: {
    allReleases: 'Toutes les versions sur GitHub',
    version: (version) => `Version ${version}`,
    installed: 'Installée',
  },

  legal: {
    lastUpdated: (date) => `Dernière mise à jour : ${date}`,
    englishOnly: 'Ce texte n’existe qu’en anglais : c’est cette version qui fait foi.',
  },

  endpoints: {
    loading: 'Chargement des environnements…',
    empty: 'Aucun environnement',
    emptyHint: 'Ce compte n’a accès à aucun environnement sur cette instance.',
    online: 'En ligne',
    offline: 'Hors ligne',
    localSocket: 'socket local',
    kubernetes: 'Environnement Kubernetes — non pris en charge par l’app.',
    snapshot: (running, stopped, imageCount) =>
      `${running} en cours · ${stopped} ${agreed(stopped, 'arrêté')} · ${images(imageCount)}`,
    noSnapshot: 'Aucun instantané disponible',
  },

  overview: {
    loading: 'Chargement de l’environnement…',
    atAGlance: 'En un coup d’œil',
    resources: 'Ressources',
    diskSpace: 'Espace disque',
    imageUpdates: 'Mises à jour des images',
    runningCaption: 'en cours',
    loadingCaption: 'chargement…',
    noStacks: 'aucune stack',
    partialStacks: (count) => `${count} ${agreed(count, 'partielle')}`,
    stoppedStacks: (count) => `${count} ${agreed(count, 'arrêtée')}`,
    allRunning: 'toutes en cours',
    allImagesInUse: 'toutes utilisées',
    allVolumesInUse: 'tous utilisés',
    unusedImages: (count) => `${count} ${agreed(count, 'inutilisée')}`,
    unusedVolumes: (count) => `${count} ${agreed(count, 'inutilisé')}`,
    allGood: 'Tout va bien',
    toCheck: (count) => `${containers(count)} à vérifier`,
    allGoodHint: 'Aucun conteneur n’est unhealthy, bloqué en redémarrage ou arrêté anormalement.',
    toCheckHint: 'Touchez un conteneur pour voir ses logs et agir dessus.',
    problems: {
      unhealthy: 'Healthcheck en échec',
      restarting: 'Redémarre en boucle',
      crashed: 'Arrêté anormalement',
      dead: 'Mort',
    },
    healthTitle: 'Santé des conteneurs',
    healthy: 'Sains',
    unhealthy: 'Unhealthy',
    noHealthcheck: 'Sans healthcheck',
    starting: (count) =>
      `${count} ${count < 2 ? 'en démarrage, pas encore vérifié' : 'en démarrage, pas encore vérifiés'}.`,
    nothingToMeasure: 'Aucun conteneur en cours : rien à mesurer.',
    measuringUsage: 'Mesure de l’utilisation…',
    cpu: 'CPU',
    cpuValue: (percent, cores) => `${percent} de ${pluralFr(cores, 'cœur')}`,
    memory: 'Mémoire',
    topConsumers: 'Plus gros consommateurs',
    resourcesFootnote:
      'Un instantané des conteneurs en cours. 100 % pour un conteneur correspond à un cœur entier.',
    noResponse: (count) =>
      `${containers(count)} ${count < 2 ? 'n’a pas répondu' : 'n’ont pas répondu'}.`,
    measuringDisk: 'Mesure de l’espace disque…',
    usedByDocker: 'utilisés par Docker',
    diskCategories: {
      images: 'Images',
      containers: 'Conteneurs',
      volumes: 'Volumes',
      buildCache: 'Cache de build',
    },
    reclaimable: (size) => `${size} récupérables en supprimant ce qui ne sert plus.`,
    updatesUnsupported:
      'Portainer ne compare pas les images de cet environnement avec leur registre. Cette vérification fait partie de Portainer Business, une fois l’indicateur de mise à jour activé sur l’environnement.',
    comparing: 'Comparaison avec les registres…',
    allUpToDate: 'Toutes les images sont à jour',
    toUpdate: (count) => `${images(count)} à mettre à jour`,
    seeWhich: 'Voir lesquelles',
    dataUnavailable: 'Données indisponibles.',
  },

  containers: {
    loading: 'Chargement des conteneurs…',
    filterPlaceholder: 'Filtrer par nom ou image',
    summary: (shown, stackCount) =>
      `${containers(shown)}${stackCount > 0 ? ` · ${stacks(stackCount)}` : ''}`,
    noStack: 'Hors stack',
    stackActions: (title) => `Actions de la stack ${title}`,
  },

  container: {
    loading: 'Chargement du conteneur…',
    actions: CONTAINER_ACTIONS,
    confirmTitle: (action) => `${CONTAINER_ACTIONS[action]} le conteneur ?`,
    impact: (action, name) => {
      if (action === 'restart') return `${name} va redémarrer et être brièvement indisponible.`;
      if (action === 'stop') return `${name} restera arrêté jusqu’à son prochain démarrage.`;
      if (action === 'pause') return `${name} ne répondra plus jusqu’à sa reprise.`;
      if (action === 'kill') {
        return (
          `${name} sera arrêté immédiatement, sans pouvoir s’éteindre proprement : ` +
          'les écritures en cours peuvent être perdues.'
        );
      }
      return '';
    },
    moreActions: 'Plus d’actions',
    health: (status) => `santé : ${status}`,
    updateImage: 'Mettre à jour l’image',
    pulling:
      'Téléchargement de l’image et recréation du conteneur… Cela peut prendre plusieurs minutes.',
    blockers: {
      portainer:
        'Portainer ne peut pas recréer son propre conteneur : mettez-le à jour depuis l’hôte.',
      swarm: 'Ce conteneur appartient à un service Swarm : mettez plutôt le service à jour.',
      autoRemove: 'Ce conteneur se supprime quand il s’arrête (--rm) : il ne peut pas être recréé.',
      untagged: 'L’image n’a pas de tag : il n’y a rien à télécharger depuis un registre.',
    },
    id: 'ID',
    created: 'Créé',
    started: 'Démarré',
    exitCode: 'Code de sortie',
    restartPolicy: 'Redémarrage',
    network: 'Réseau',
    envVariables: 'Variables d’env.',
    volumes: 'Volumes',
    deleteNotApplied: 'Le conteneur n’a pas pu être supprimé.',
    imageUpdated: 'Image mise à jour',
    imageUpdatedMessage: (name) => `${name} a été recréé avec la dernière image.`,
    updateFailed: 'Échec de la mise à jour',
    recreateNotApplied: 'Le conteneur n’a pas pu être recréé.',
    deleteTitle: 'Supprimer le conteneur ?',
    removal: (name, running) =>
      (running ? `${name} sera arrêté, puis supprimé. ` : `${name} sera supprimé. `) +
      'Tout ce qui n’est pas dans un volume est perdu ; il faudra le recréer pour le relancer.',
    alsoVolumes: 'Supprimer aussi ses volumes anonymes',
    namedVolumesKept: 'Les volumes nommés sont toujours conservés.',
    updateTitle: 'Mettre à jour l’image ?',
    update: 'Mettre à jour',
    updateMessage: (name, image) =>
      `Portainer va télécharger la dernière version de ${image}, puis supprimer ${name} ` +
      'et le recréer avec la même configuration. Les données hors volume ' +
      'seront perdues.',
    menu: {
      pause: {
        label: 'Suspendre',
        hint: 'Gèle ses processus sans les arrêter : il ne répond plus jusqu’à sa reprise.',
      },
      unpause: { label: 'Reprendre', hint: 'Relance ses processus là où ils ont été gelés.' },
      kill: {
        label: 'Tuer',
        hint: 'L’arrête sur-le-champ, sans laisser l’application s’éteindre proprement.',
      },
      remove: { label: 'Supprimer le conteneur', hint: 'Ses volumes nommés sont conservés.' },
    },
    imageStatus: {
      updated: 'Image à jour',
      outdated: 'Mise à jour de l’image disponible',
      processing: 'Vérification de l’image…',
      unknown: 'État de l’image inconnu',
    },
  },

  logs: {
    show: 'Afficher les logs',
    title: 'Logs',
    shareTitle: (name) => `Logs de ${name}`,
    sharingFailed: 'Échec du partage',
    notShared: 'Les logs n’ont pas pu être partagés.',
    status: (lines, live) => `${pluralFr(lines, 'ligne')}${live ? ' · en direct' : ''}`,
    unavailable: 'Logs indisponibles.',
    empty: 'Aucune sortie sur cette période.',
    truncated: (shown) =>
      `Seules les ${shown} dernières lignes sont affichées : passez en plein écran pour tout lire.`,
    fullscreenTitle: (name) => `Logs · ${name}`,
    follow: 'Suivre en direct',
    timestamps: 'Afficher l’horodatage',
    copy: 'Copier les logs',
    copied: 'Logs copiés',
    share: 'Partager les logs',
    fullscreen: 'Plein écran',
    exitFullscreen: 'Quitter le plein écran',
    ranges: {
      'tail-100': '100 lignes',
      'tail-500': '500 lignes',
      'tail-2000': '2 000 lignes',
      'since-15m': '15 min',
      'since-1h': '1 h',
      'since-24h': '24 h',
    },
  },

  stacks: {
    loading: 'Chargement des stacks…',
    filterPlaceholder: 'Filtrer par nom',
    summary: (total, managed, external) =>
      `${stacks(total)} · ${managed} ${agreed(managed, 'gérée')} par Portainer` +
      (external > 0 ? ` · ${external} ${agreed(external, 'externe')}` : ''),
    detailsUnavailable: (message) => `Détails Portainer indisponibles : ${message}`,
    unknownError: 'erreur inconnue',
    empty: 'Aucune stack',
    kinds: {
      compose: 'Compose',
      swarm: 'Swarm',
      external: 'Externe',
    },
    outsidePortainer: 'Déployée hors de Portainer',
    origin: (date, user) =>
      [date ? `Créée le ${date}` : '', user ? `par ${user}` : ''].filter(Boolean).join(' ') ||
      'Gérée par Portainer',
    git: (reference, interval) =>
      `Git · ${reference}${interval ? ` · mise à jour auto toutes les ${interval}` : ''}`,
    result: (action, succeeded, failed) => {
      const participle = agreed(succeeded, action === 'start' ? 'démarré' : 'arrêté');
      return failed === 0
        ? `${containers(succeeded)} ${participle}.`
        : `${containers(succeeded)} ${participle}, ${failed} en échec.`;
    },
    startStack: 'Démarrer la stack',
    stopStack: 'Arrêter la stack',
    confirmTitle: (action) => (action === 'start' ? 'Démarrer la stack ?' : 'Arrêter la stack ?'),
    actions: { start: 'Démarrer', stop: 'Arrêter' },
    sheetSummary: (running, total) => `${running}/${total} en cours · ${containers(total)}`,
    impact: (action, total, title) => {
      const verb = action === 'start' ? 'démarré' : 'arrêté';
      return total > 1
        ? `Les ${total} conteneurs de la stack ${title} seront ${verb}s, y compris ceux masqués par un filtre.`
        : `Le conteneur de la stack ${title} sera ${verb}.`;
    },
    imageStatus: {
      updated: 'Images à jour',
      outdated: 'Mise à jour d’image disponible',
      processing: 'Vérification des images…',
      unknown: 'État des images inconnu',
    },
  },

  stack: {
    loading: 'Chargement de la stack…',
    notFound: 'Stack introuvable',
    notFoundHint: 'Elle a peut-être été supprimée, ou ses conteneurs ont disparu.',
    redeployed: 'Stack redéployée',
    redeployedMessage: (name) => `${name} a été redéployée.`,
    redeployFailed: 'Échec du redéploiement',
    redeployNotApplied: 'La stack n’a pas pu être redéployée.',
    externalNote: 'Stack déployée hors de Portainer : seuls ses conteneurs sont connus.',
    startStop: 'Démarrer / arrêter',
    redeploy: 'Redéployer',
    redeploying: 'Redéploiement… Télécharger les images peut prendre plusieurs minutes.',
    type: 'Type',
    portainerStatus: 'État Portainer',
    active: 'Active',
    inactive: 'Inactive',
    created: 'Créée',
    by: 'Par',
    updated: 'Mise à jour',
    file: 'Fichier',
    gitRepository: 'Dépôt Git',
    reference: 'Référence',
    autoUpdate: 'Mise à jour auto',
    autoUpdateEvery: (interval) => `Toutes les ${interval}`,
    autoUpdateByWebhook: 'Par webhook',
    webhook: 'Webhook',
    yes: 'Oui',
    no: 'Non',
    envTitle: 'Variables d’environnement',
    noVariables: 'Aucune variable définie dans Portainer.',
    containers: 'Conteneurs',
    saveTitle: 'Enregistrer et redéployer ?',
    saveConfirm: 'Enregistrer et redéployer',
    envChange: (diff) => {
      const parts = [
        diff.added.length ? `Ajoutées : ${diff.added.join(', ')}.` : '',
        diff.changed.length ? `Modifiées : ${diff.changed.join(', ')}.` : '',
        diff.removed.length ? `Supprimées : ${diff.removed.join(', ')}.` : '',
      ].filter(Boolean);
      const summary = parts.length ? parts.join(' ') : 'Aucune variable modifiée.';
      return `${summary} La stack sera redéployée pour les appliquer : les conteneurs concernés seront recréés.`;
    },
    namePlaceholder: 'NOM',
    valuePlaceholder: 'valeur',
    nameLabel: 'Nom de la variable',
    valueOf: (name) => `Valeur de ${name || 'la variable'}`,
    removeVariable: (name) => `Retirer ${name || 'la variable'}`,
    addVariable: '+ Ajouter une variable',
    envError: (error) =>
      error.kind === 'required'
        ? 'Nom obligatoire.'
        : error.kind === 'invalid'
          ? 'Lettres, chiffres et _ uniquement, sans chiffre au début.'
          : `${error.name} est déjà défini plus haut.`,
    showFile: 'Afficher le fichier Compose',
    fileTitle: 'Fichier Compose',
    hideSecrets: 'Masquer les secrets',
    revealSecrets: (count) => `Afficher les secrets (${count})`,
    fileUnavailable: 'Fichier indisponible.',
    emptyFile: 'Fichier vide.',
    hideFile: 'Masquer le fichier Compose',
    redeployTitle: (name) => `Redéployer ${name}`,
    redeployGit: (branch) =>
      `Récupère la dernière version de ${branch}, puis recrée les services qui ont changé.`,
    redeployFile: 'Recrée les services à partir du fichier Compose stocké dans Portainer.',
    trackedBranch: 'la branche suivie',
    updateFromGit: 'Mettre à jour depuis Git',
    gitWithImages: 'Depuis Git, avec les dernières images',
    pullAndRedeploy: 'Télécharger les images et redéployer',
    redeployConfirmTitle: (name) => `Redéployer ${name} ?`,
    redeployImpact: (pullImages) =>
      'Les conteneurs concernés seront recréés : le service est brièvement interrompu, et ' +
      'tout ce qui n’est pas dans un volume est perdu.' +
      (pullImages ? ' Télécharger les images peut prendre plusieurs minutes.' : ''),
  },

  images: {
    loading: 'Chargement des images…',
    deleteNotApplied: 'L’image n’a pas pu être supprimée.',
    pruneNotApplied: 'Les images n’ont pas pu être supprimées.',
    summary: (total, unused, reclaimable) =>
      `${images(total)} · ${unused} ${agreed(unused, 'inutilisée')}` +
      (reclaimable ? ` · ${reclaimable} récupérables` : ''),
    cleanUp: 'Nettoyer les images',
    filters: { all: 'Toutes', used: 'Utilisées', unused: 'Inutilisées', outdated: 'Périmées' },
    none: 'aucune',
    allUpToDate: 'Toutes les images sont à jour',
    empty: 'Aucune image',
    deleteTitle: 'Supprimer l’image ?',
    deleteConfirm: 'Supprimer l’image',
    removal: (label, size, tags) =>
      `${label} (${size}) sera retirée de l’environnement` +
      (tags > 1 ? `, avec ses ${tags} tags. ` : '. ') +
      'Il faudra la télécharger à nouveau pour la réutiliser.',
    noneDeleted: 'Aucune image n’a été supprimée.',
    deleted: (count, freed) => `${images(count)} ${agreed(count, 'supprimée')} · ${freed} libérés.`,
    newVersion: 'Nouvelle version disponible',
    dangling: 'Image sans tag (dangling)',
    tags: (count) => `${count} tags`,
    scopes: {
      dangling: 'Images sans tag',
      unused: 'Toutes les images inutilisées',
    },
    pruneMessage: 'Seules les images qu’aucun conteneur n’utilise, même arrêté, sont supprimées.',
    pruneTitle: (count) => (count > 1 ? `Supprimer ${count} images ?` : 'Supprimer l’image ?'),
    pruneImpact: (scope) =>
      scope === 'dangling'
        ? 'Les images sans tag, restes de builds ou de mises à jour, seront supprimées.'
        : 'Toutes les images inutilisées seront supprimées, y compris celles qui ont un tag. ' +
          'Il faudra les télécharger à nouveau pour en créer un conteneur.',
    pruneConfirm: 'Nettoyer',
  },

  volumes: {
    loading: 'Chargement des volumes…',
    deleteNotApplied: 'Le volume n’a pas pu être supprimé.',
    pruneNotApplied: 'Les volumes n’ont pas pu être supprimés.',
    summary: (total, unused, reclaimable) =>
      `${volumes(total)} · ${unused} ${agreed(unused, 'inutilisé')}` +
      (reclaimable ? ` · ${reclaimable} récupérables` : ''),
    cleanUp: 'Nettoyer les volumes',
    none: 'aucun',
    empty: 'Aucun volume',
    deleteTitle: 'Supprimer le volume ?',
    deletePermanently: 'Supprimer définitivement',
    confirmWord: 'supprimer',
    removal: (name, size) =>
      `${name}${size ? ` (${size})` : ''} et toutes ses ` +
      'données seront supprimés définitivement. Impossible de les récupérer.',
    deleted: (deleted, expected, freed) => {
      if (deleted === 0) return 'Aucun volume n’a été supprimé.';
      const gap = deleted !== expected ? ` (${expected} ${agreed(expected, 'attendu')})` : '';
      return `${volumes(deleted)} ${agreed(deleted, 'supprimé')}${freed ? ` · ${freed} libérés` : ''}${gap}.`;
    },
    anonymous: 'anonyme',
    scopes: {
      anonymous: 'Volumes anonymes',
      all: 'Tous les volumes inutilisés',
    },
    pruneMessage:
      'Seuls les volumes qu’aucun conteneur n’utilise, même arrêté, sont supprimés. Leurs données sont perdues pour de bon.',
    oldEngine:
      'Ce moteur Docker, antérieur à la version 23, ne sait pas limiter le nettoyage aux volumes anonymes : seul le nettoyage complet est proposé.',
    pruneTitle: (count) => (count > 1 ? `Supprimer ${count} volumes ?` : 'Supprimer le volume ?'),
    pruneImpact: {
      anonymous:
        'Les volumes anonymes inutilisés et leurs données seront supprimés définitivement.',
      all: 'Tous les volumes inutilisés, nommés compris, seront supprimés avec leurs données. Impossible de les récupérer.',
    },
  },

  certificates: CERTIFICATE_HELP_FR,

  settings: {
    appearance: 'Apparence',
    appearances: {
      system: 'Comme l’appareil',
      light: 'Clair',
      dark: 'Sombre',
    },
    language: 'Langue',
    refresh: 'Actualisation',
    refreshHint:
      'La liste des conteneurs se met à jour toute seule. Un intervalle plus long économise la batterie et les données mobiles ; en mode manuel, tirez la liste vers le bas pour l’actualiser.',
    interval: (ms) =>
      ms === null
        ? 'Manuelle'
        : ms === 60_000
          ? 'Toutes les minutes'
          : `Toutes les ${ms / 1000} secondes`,
    notifications: 'Notifications',
    alerts: 'Alertes de vos conteneurs',
    alertsHint: 'Le jeton dont votre service de surveillance a besoin',
    help: 'Aide',
    reportProblem: 'Signaler un problème',
    reportProblemHint:
      'Ouvre GitHub avec la version et l’appareil préremplis — rien sur votre instance',
    certificate: 'Certificat HTTPS',
    certificateHint: 'Faire accepter à ce téléphone un certificat auto-signé ou privé',
    sourceCode: 'Code source',
    about: 'À propos',
    whatsNew: 'Nouveautés',
    version: (version) => `Version ${version}`,
    terms: 'Conditions d’utilisation',
    privacy: 'Politique de confidentialité',
  },
};
