import { execSync } from 'node:child_process';
import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Fills in `app.json` with what varies from build to build.
 *
 * The stores require a strictly increasing build number on every submission.
 * In CI, `BUILD_NUMBER` comes from the workflow run counter; locally, it's
 * absent and `app.json`'s values apply.
 *
 * The commit is stamped into `extra.build`: a tester reading
 * "1.0.0 (57) · a1d8e36" in the app can point to the exact code they're
 * running, without going through GitHub or the store console.
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
