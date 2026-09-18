// Checks and publishes the release notes from src/changelog.ts.
//
// The changelog is bundled in the binary: a note added after the tag would
// never reach users of the compiled version. It's also the single source of
// published notes — GitHub Release, TestFlight, Google Play — so the app, the
// repo and the stores all tell the same story.
//
//   npm run changelog                        checks the changelog (CI)
//   npm run changelog -- --notes             prints the current version's notes
//   npm run changelog -- --notes --max=500   same, truncated to a store's limit

import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import path from 'node:path';

// Node runs .ts files by stripping types, but requires the extension in
// imports; src imports without one, as Metro allows.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && path.extname(specifier) === '') {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const ROOT = path.resolve(import.meta.dirname, '..');
const { CHANGELOG } = await import('../src/changelog.ts');
const { expo } = JSON.parse(await readFile(path.join(ROOT, 'app.json'), 'utf8'));

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const [latest, ...older] = CHANGELOG;

if (!latest) fail('src/changelog.ts est vide : décrivez au moins la version courante.');

if (latest.version !== expo.version) {
  fail(
    `src/changelog.ts décrit ${latest.version} alors que app.json annonce ${expo.version}.\n` +
      "Ajoutez l'entrée de la nouvelle version en tête du changelog avant de poser le tag.",
  );
}

if (process.argv.includes('--notes')) {
  const max = Number(process.argv.find((arg) => arg.startsWith('--max='))?.slice('--max='.length));
  process.stdout.write(`${notes(latest, Number.isInteger(max) ? max : null)}\n`);
  process.exit(0);
}

const duplicate = CHANGELOG.find(
  (release, index) => CHANGELOG.findIndex((other) => other.version === release.version) !== index,
);
if (duplicate) fail(`La version ${duplicate.version} apparaît deux fois dans src/changelog.ts.`);

const empty = CHANGELOG.find((release) => release.changes.length === 0);
if (empty) fail(`La version ${empty.version} n'a aucune note dans src/changelog.ts.`);

console.log(
  `Changelog à jour : ${latest.version}, ${latest.changes.length} note(s)` +
    `${older.length > 0 ? `, ${older.length} version(s) précédente(s)` : ''}.`,
);

/**
 * Plain-text notes, one bullet per line.
 *
 * Google Play rejects anything past 500 characters: we cut at whole bullets
 * rather than mid-sentence, even if it means dropping the last ones.
 */
function notes(release, max) {
  const lines = release.changes.map((change) => `- ${change}`);
  if (max === null) return lines.join('\n');

  const kept = [];
  let length = 0;
  for (const line of lines) {
    const added = kept.length === 0 ? line.length : length + 1 + line.length;
    if (added > max) break;
    kept.push(line);
    length = added;
  }
  // A first bullet that's already too long is better truncated than absent.
  if (kept.length === 0) return `${lines[0].slice(0, Math.max(max - 1, 0))}…`;
  return kept.join('\n');
}
