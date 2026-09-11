import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Complète `app.json` avec ce qui varie d'un build à l'autre.
 *
 * Les stores exigent un numéro de build strictement croissant à chaque envoi.
 * En CI, `BUILD_NUMBER` vient du compteur d'exécutions du workflow ; en local,
 * il est absent et les valeurs de `app.json` s'appliquent.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const buildNumber = process.env.BUILD_NUMBER?.trim();
  if (!buildNumber) return config as ExpoConfig;

  if (!/^\d+$/.test(buildNumber)) {
    throw new Error(`BUILD_NUMBER doit être un entier, reçu « ${buildNumber} ».`);
  }

  return {
    ...config,
    ios: { ...config.ios, buildNumber },
    android: { ...config.android, versionCode: Number(buildNumber) },
  } as ExpoConfig;
};
