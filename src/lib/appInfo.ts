import { Platform } from 'react-native';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

/** Installed app version, as shown by the stores. */
export function appVersion(): string {
  return Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '?';
}

/**
 * Identity of the installed build: version and build number read from the
 * binary, commit stamped by `app.config.ts`.
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
 * Context attached to a bug report. Deliberately limited to the binary and
 * the device: no instance address, token, or container name should ever go
 * to a public repo.
 */
export function diagnostics(): string {
  const system = `${Device.osName ?? Platform.OS} ${Device.osVersion ?? String(Platform.Version)}`;
  return [versionLine(), [system, Device.modelName].filter(Boolean).join(' · ')].join('\n');
}
