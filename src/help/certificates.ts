/**
 * Help shown when an HTTPS instance can't be reached: how to present the
 * device with a certificate it trusts.
 *
 * Kept as data, like the legal texts: the screen only lays it out. The
 * Android device steps rely on `plugins/withUserCertificates.js`; without
 * it, the app would ignore a CA the user installed, whatever this text says.
 */
export interface HelpStep {
  text: string;
  /** Command or config to type, shown copyable. */
  code?: string;
}

export interface CertificateSolution {
  id: string;
  title: string;
  /** When to prefer this solution over the others. */
  bestFor: string;
  summary: string;
  steps: HelpStep[];
  /** Caveat worth reading before starting. */
  note?: string;
}

export const CERTIFICATE_HELP_INTRO =
  "iOS et Android refusent les certificats auto-signés, comme celui que Portainer génère par défaut sur le port 9443. L'application ne peut pas passer outre : la solution est de présenter à l'appareil un certificat qu'il reconnaît. Voici trois façons d'y arriver, de la plus simple à la plus manuelle.";

export const CERTIFICATE_SOLUTIONS: readonly CertificateSolution[] = [
  {
    id: 'tailscale',
    title: 'Tailscale',
    bestFor: 'Idéal pour joindre votre serveur de partout, sans ouvrir de port.',
    summary:
      "Tailscale fournit un certificat Let's Encrypt valide pour l'adresse de votre serveur sur votre réseau Tailscale.",
    steps: [
      { text: 'Installez Tailscale sur le serveur et sur ce téléphone, sur le même réseau.' },
      {
        text: "Dans la console d'administration Tailscale, activez MagicDNS et les certificats HTTPS (onglet DNS).",
      },
      {
        text: 'Sur le serveur, exposez Portainer en HTTPS :',
        code: 'tailscale serve --bg https+insecure://localhost:9443',
      },
      {
        text: "Connectez-vous avec l'adresse de la machine sur votre réseau Tailscale :",
        code: 'https://serveur.votre-reseau.ts.net',
      },
    ],
    note: '« https+insecure » ne concerne que le trajet local entre Tailscale et Portainer, sur le serveur lui-même : ce téléphone, lui, reçoit un certificat valide.',
  },
  {
    id: 'reverse-proxy',
    title: "Reverse proxy et Let's Encrypt",
    bestFor: 'Idéal si vous avez déjà un nom de domaine.',
    summary:
      "Un reverse proxy obtient un certificat Let's Encrypt et le présente à la place de celui de Portainer.",
    steps: [
      {
        text: 'Faites pointer un nom, par exemple portainer.example.com, vers votre reverse proxy.',
      },
      {
        text: 'Déclarez Portainer derrière le proxy. Avec Caddy, sur le même réseau Docker que le conteneur portainer :',
        code: [
          'portainer.example.com {',
          '  reverse_proxy https://portainer:9443 {',
          '    transport http {',
          '      tls_insecure_skip_verify',
          '    }',
          '  }',
          '}',
        ].join('\n'),
      },
      {
        text: "Pour un nom joignable uniquement sur votre réseau local, utilisez le challenge DNS de Let's Encrypt : Caddy, Traefik et Nginx Proxy Manager le prennent en charge avec la plupart des fournisseurs DNS.",
      },
      { text: "Connectez-vous avec l'adresse du proxy :", code: 'https://portainer.example.com' },
    ],
  },
  {
    id: 'own-ca',
    title: 'Votre propre autorité avec mkcert',
    bestFor: 'Idéal pour un réseau local, sans nom de domaine.',
    summary:
      'Vous créez votre propre autorité de certification, vous signez avec elle le certificat de Portainer, puis vous installez cette autorité sur ce téléphone.',
    steps: [
      {
        text: "Sur un ordinateur, installez mkcert, puis créez un certificat pour les adresses que vous saisissez dans l'application (nom, IP, ou les deux) :",
        code: 'mkcert portainer.lan 192.168.1.10',
      },
      {
        text: 'Démarrez Portainer avec ce certificat, placé dans un dossier certs monté sur /certs :',
        code: [
          'docker run -d -p 9443:9443 --name portainer \\',
          '  -v /var/run/docker.sock:/var/run/docker.sock \\',
          '  -v portainer_data:/data -v "$PWD/certs:/certs" \\',
          '  portainer/portainer-ce \\',
          '  --sslcert /certs/portainer.lan+1.pem \\',
          '  --sslkey /certs/portainer.lan+1-key.pem',
        ].join('\n'),
      },
      {
        text: "Récupérez l'autorité : c'est le fichier rootCA.pem du dossier indiqué par cette commande.",
        code: 'mkcert -CAROOT',
      },
      {
        text: 'Envoyez rootCA.pem sur ce téléphone (AirDrop, e-mail, fichier), puis installez-le comme indiqué plus bas.',
      },
    ],
    note: 'Ne transférez jamais rootCA-key.pem : quiconque détient cette clé peut créer des certificats que ce téléphone acceptera, pour n’importe quel site.',
  },
];

export const DEVICE_TRUST_TITLE = "Installer l'autorité sur ce téléphone";

/** Installing a user CA differs enough between the platforms to need its own steps. */
export const DEVICE_TRUST_STEPS: Record<'ios' | 'android', readonly HelpStep[]> = {
  ios: [
    { text: "Ouvrez rootCA.pem sur l'iPhone : iOS propose de télécharger un profil." },
    { text: "Réglages › Général › VPN et gestion de l'appareil : installez le profil." },
    {
      text: 'Réglages › Général › Informations › Réglages des certificats : activez la confiance totale pour ce certificat. Sans cette étape, iOS installe le profil mais refuse toujours la connexion.',
    },
  ],
  android: [
    {
      text: "Copiez rootCA.pem sur le téléphone. Renommez-le en rootCA.crt si le système ne le propose pas à l'installation.",
    },
    {
      text: 'Paramètres › Sécurité › Chiffrement et identifiants › Installer un certificat › Certificat CA. Le chemin varie selon le fabricant : cherchez « certificat » dans les paramètres.',
    },
    {
      text: 'Beaucoup d’applications ignorent les autorités installées ainsi. StackPilot, non : elle les accepte au même titre que celles du système.',
    },
  ],
};

export const CERTIFICATE_HELP_FOOTNOTE =
  "Et accepter tel quel le certificat par défaut de Portainer ? Il faudrait que l'application contourne la vérification du système, ce qu'elle ne fait pas : les solutions ci-dessus protègent réellement la connexion, sans exception à gérer.";
