import { execSync } from 'node:child_process';
import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Complète `app.json` avec ce qui varie d'un build à l'autre.
 *
 * Les stores exigent un numéro de build strictement croissant à chaque envoi.
 * En CI, `BUILD_NUMBER` vient du compteur d'exécutions du workflow ; en local,
 * il est absent et les valeurs de `app.json` s'appliquent.
 *
 * Le commit est gravé dans `extra.build` : un testeur qui lit
 * « 1.0.0 (57) · a1d8e36 » dans l'app désigne le code exact qu'il fait tourner,
 * sans passer par GitHub ni par la console du store.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const buildNumber = process.env.BUILD_NUMBER?.trim();
  if (buildNumber && !/^\d+$/.test(buildNumber)) {
    throw new Error(`BUILD_NUMBER doit être un entier, reçu « ${buildNumber} ».`);
  }

  return {
    ...config,
    ios: { ...config.ios, ...(buildNumber && { buildNumber }) },
    android: { ...config.android, ...(buildNumber && { versionCode: Number(buildNumber) }) },
    extra: {
      ...config.extra,
      build: { commit: currentCommit(), ...(buildNumber && { number: buildNumber }) },
    },
  } as ExpoConfig;
};

function currentCommit(): string | null {
  const fromCi = process.env.GITHUB_SHA?.trim();
  if (fromCi) return fromCi.slice(0, 7);
  try {
    return execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}
