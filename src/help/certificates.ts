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
  "iOS and Android reject self-signed certificates, like the one Portainer generates by default on port 9443. The app can't override this: the fix is to present the device with a certificate it trusts. Here are three ways to get there, from the simplest to the most hands-on.";

export const CERTIFICATE_SOLUTIONS: readonly CertificateSolution[] = [
  {
    id: 'tailscale',
    title: 'Tailscale',
    bestFor: 'Best for reaching your server from anywhere, without opening a port.',
    summary:
      "Tailscale provides a valid Let's Encrypt certificate for your server's address on your Tailscale network.",
    steps: [
      { text: 'Install Tailscale on the server and on this phone, on the same network.' },
      {
        text: 'In the Tailscale admin console, enable MagicDNS and HTTPS certificates (DNS tab).',
      },
      {
        text: 'On the server, serve Portainer over HTTPS:',
        code: 'tailscale serve --bg https+insecure://localhost:9443',
      },
      {
        text: "Sign in with the machine's address on your Tailscale network:",
        code: 'https://server.your-tailnet.ts.net',
      },
    ],
    note: '"https+insecure" only covers the local hop between Tailscale and Portainer, on the server itself: this phone still gets a valid certificate.',
  },
  {
    id: 'reverse-proxy',
    title: "Reverse proxy and Let's Encrypt",
    bestFor: 'Best if you already own a domain name.',
    summary:
      "A reverse proxy obtains a Let's Encrypt certificate and presents it in place of Portainer's.",
    steps: [
      {
        text: 'Point a name, for example portainer.example.com, at your reverse proxy.',
      },
      {
        text: 'Put Portainer behind the proxy. With Caddy, on the same Docker network as the portainer container:',
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
        text: "For a name only reachable on your local network, use Let's Encrypt's DNS challenge: Caddy, Traefik and Nginx Proxy Manager support it with most DNS providers.",
      },
      { text: "Sign in with the proxy's address:", code: 'https://portainer.example.com' },
    ],
  },
  {
    id: 'own-ca',
    title: 'Your own authority with mkcert',
    bestFor: 'Best for a local network, without a domain name.',
    summary:
      "You create your own certificate authority, sign Portainer's certificate with it, then install that authority on this phone.",
    steps: [
      {
        text: 'On a computer, install mkcert, then create a certificate for the addresses you type in the app (name, IP, or both):',
        code: 'mkcert portainer.lan 192.168.1.10',
      },
      {
        text: 'Start Portainer with this certificate, placed in a certs folder mounted on /certs:',
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
        text: "Get the authority: it's the rootCA.pem file in the folder this command prints.",
        code: 'mkcert -CAROOT',
      },
      {
        text: 'Send rootCA.pem to this phone (AirDrop, email, file), then install it as shown below.',
      },
    ],
    note: 'Never share rootCA-key.pem: anyone holding this key can create certificates this phone will accept, for any website.',
  },
];

export const DEVICE_TRUST_TITLE = 'Install the authority on this phone';

/** Installing a user CA differs enough between the platforms to need its own steps. */
export const DEVICE_TRUST_STEPS: Record<'ios' | 'android', readonly HelpStep[]> = {
  ios: [
    { text: 'Open rootCA.pem on the iPhone: iOS offers to download a profile.' },
    { text: 'Settings › General › VPN & Device Management: install the profile.' },
    {
      text: 'Settings › General › About › Certificate Trust Settings: turn on full trust for this certificate. Without this step, iOS installs the profile but still refuses the connection.',
    },
  ],
  android: [
    {
      text: "Copy rootCA.pem to the phone. Rename it to rootCA.crt if the system doesn't offer to install it.",
    },
    {
      text: 'Settings › Security › Encryption & credentials › Install a certificate › CA certificate. The path varies by manufacturer: search the settings for "certificate".',
    },
    {
      text: 'Many apps ignore authorities installed this way. StackPilot does not: it accepts them just like the system ones.',
    },
  ],
};

export const CERTIFICATE_HELP_FOOTNOTE =
  "Why not just accept Portainer's default certificate? The app would have to bypass the system's verification, which it doesn't do: the solutions above genuinely protect the connection, with no exception to manage.";
