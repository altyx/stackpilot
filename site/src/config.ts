/**
 * Values the site shows that the app also knows about.
 *
 * Deliberately copied rather than imported from the app's src/: the site and
 * the app build independently and share only data files (docs/legal,
 * docs/screenshot, assets).
 */
export const SITE = {
  name: 'StackPilot',
  tagline: 'Your Portainer, in your pocket.',
  description:
    'StackPilot is a mobile app for Portainer, on iPhone, iPad and Android. Check on your Docker hosts, read logs and act on containers and stacks from anywhere.',
  /** Store listings: null until the app is live, shown as "Coming soon". */
  appStoreUrl: 'https://apps.apple.com/fr/app/stackpilot/id6812265629',
  playStoreUrl: null as string | null,
  sourceCodeUrl: 'https://github.com/altyx/stackpilot',
  contactEmail: 'samir@altyxlab.fr',
};
