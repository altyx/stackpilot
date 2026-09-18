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
    date: '16 septembre 2026',
    changes: ["Ajout d'une page settings applicatif"],
  },
];

/** Version described at the top of the changelog, the one the app bundles. */
export const LATEST_RELEASE: Release = CHANGELOG[0];
