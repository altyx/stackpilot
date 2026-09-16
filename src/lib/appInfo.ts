import { Platform } from 'react-native';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

/** Version de l'application installée, telle qu'affichée par les stores. */
export function appVersion(): string {
  return Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '?';
}

/**
 * Identité de la version installée : version et numéro de build lus dans le
 * binaire, commit gravé par `app.config.ts`.
 */
export function versionLine(): string {
  const version = appVersion();
  const build = Application.nativeBuildVersion;
  const commit = (Constants.expoConfig?.extra as { build?: { commit?: string | null } } | undefined)
    ?.build?.commit;

  const parts = [`StackPilot ${version}${build ? ` (${build})` : ''}`];
  if (commit) parts.push(commit);
  return parts.join(' · ');
}

/**
 * Contexte joint à un signalement de bogue. Volontairement limité au binaire et
 * à l'appareil : ni adresse d'instance, ni jeton, ni nom de conteneur ne doivent
 * partir vers un dépôt public.
 */
export function diagnostics(): string {
  const system = `${Device.osName ?? Platform.OS} ${Device.osVersion ?? String(Platform.Version)}`;
  return [versionLine(), [system, Device.modelName].filter(Boolean).join(' · ')].join('\n');
}
