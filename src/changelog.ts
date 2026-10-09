/**
 * Release notes shown in Settings › What's new.
 *
 * The top entry must carry `app.json`'s version: `npm run changelog` checks
 * it, and the publish workflow refuses to build otherwise. So the changelog
 * is written **before** bumping the version and cutting the tag, since it's
 * the compiled binary that bundles it.
 *
 * The lines describe what the user sees change, not the technical detail:
 * that lives in the Git history.
 */
export interface Release {
  /** Version in `X.Y.Z` format, matching `app.json`. */
  version: string;
  /** Release date, in the same format as the legal texts. */
  date: string;
  changes: string[];
}

export const CHANGELOG: readonly Release[] = [
  {
    version: '1.0.0',
    date: 'October 9, 2026',
    changes: [
      'Overview of each environment: unhealthy containers, CPU, memory, disk use and pending updates',
      'Start, stop, restart, pause, kill, delete or update containers',
      'Live container logs, with time ranges, full screen view and sharing',
      'Stacks: start, stop, redeploy and edit environment variables',
      'Clean up unused images and volumes',
      'Push alerts when a container crashes or turns unhealthy',
      'Sign in with an access token or password, with help for self-signed certificates',
    ],
  },
];

/** Version described at the top of the changelog, the one the app bundles. */
export const LATEST_RELEASE: Release = CHANGELOG[0];
