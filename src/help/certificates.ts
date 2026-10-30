import type { TFunction } from 'i18next';

/**
 * Help shown when an HTTPS instance can't be reached: how to present the
 * device with a certificate it trusts.
 *
 * The wording lives in the catalogs (`certificates` in `src/i18n/locales`);
 * this module pairs it with the commands, the same in every language. The
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

// Commands and config are the same in every language.
const TAILSCALE_SERVE = 'tailscale serve --bg https+insecure://localhost:9443';
const TAILSCALE_URL = 'https://server.your-tailnet.ts.net';
const PROXY_URL = 'https://portainer.example.com';
const MKCERT_CREATE = 'mkcert portainer.lan 192.168.1.10';
const MKCERT_CAROOT = 'mkcert -CAROOT';
const CADDYFILE = [
  'portainer.example.com {',
  '  reverse_proxy https://portainer:9443 {',
  '    transport http {',
  '      tls_insecure_skip_verify',
  '    }',
  '  }',
  '}',
].join('\n');
const PORTAINER_WITH_CERT = [
  'docker run -d -p 9443:9443 --name portainer \\',
  '  -v /var/run/docker.sock:/var/run/docker.sock \\',
  '  -v portainer_data:/data -v "$PWD/certs:/certs" \\',
  '  portainer/portainer-ce \\',
  '  --sslcert /certs/portainer.lan+1.pem \\',
  '  --sslkey /certs/portainer.lan+1-key.pem',
].join('\n');

export interface CertificateHelp {
  intro: string;
  solutions: CertificateSolution[];
  deviceTrustTitle: string;
  /** This device's steps only: the other platform's settings paths are noise. */
  deviceTrustSteps: HelpStep[];
  footnote: string;
}

type SolutionId = 'tailscale' | 'reverse-proxy' | 'own-ca';

/** Command shown under each step, by step index. */
const SOLUTION_CODES: Record<SolutionId, (string | undefined)[]> = {
  tailscale: [undefined, undefined, TAILSCALE_SERVE, TAILSCALE_URL],
  'reverse-proxy': [undefined, CADDYFILE, undefined, PROXY_URL],
  'own-ca': [MKCERT_CREATE, PORTAINER_WITH_CERT, MKCERT_CAROOT, undefined],
};

interface SolutionText {
  title: string;
  bestFor: string;
  summary: string;
  steps: string[];
  note?: string;
}

export function certificateHelp(t: TFunction, platform: 'ios' | 'android'): CertificateHelp {
  const solutions = (Object.keys(SOLUTION_CODES) as SolutionId[]).map((id) => {
    // Not every solution has a note: the catalog's union type can't say which.
    const text = t(`certificates.solutions.${id}`, { returnObjects: true }) as SolutionText;
    return {
      id,
      title: text.title,
      bestFor: text.bestFor,
      summary: text.summary,
      steps: text.steps.map((step, index) => ({ text: step, code: SOLUTION_CODES[id][index] })),
      note: text.note,
    };
  });
  return {
    intro: t('certificates.intro'),
    solutions,
    deviceTrustTitle: t('certificates.deviceTrustTitle'),
    deviceTrustSteps: t(`certificates.deviceTrust.${platform}`, { returnObjects: true }).map(
      (text) => ({ text }),
    ),
    footnote: t('certificates.footnote'),
  };
}
