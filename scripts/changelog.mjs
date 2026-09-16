// Contrôle et publication des notes de version de src/changelog.ts.
//
// Le changelog est embarqué dans le binaire : une note ajoutée après le tag
// n'atteindrait jamais les utilisateurs de la version compilée. C'est aussi la
// source unique des notes publiées — GitHub Release, TestFlight, Google Play —
// pour que l'app, le dépôt et les stores racontent la même chose.
//
//   npm run changelog                        vérifie le changelog (CI)
//   npm run changelog -- --notes             imprime les notes de la version courante
//   npm run changelog -- --notes --max=500   idem, tronqué à la limite d'un store

import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import path from 'node:path';

// Node exécute les .ts en retirant les types, mais exige l'extension dans les
// imports ; src importe sans, comme le permet Metro.
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
 * Les notes en texte simple, une puce par ligne.
 *
 * Google Play refuse au-delà de 500 caractères : on coupe aux puces entières
 * plutôt qu'en plein milieu d'une phrase, quitte à en perdre les dernières.
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
  // Une première puce déjà trop longue vaut mieux tronquée qu'absente.
  if (kept.length === 0) return `${lines[0].slice(0, Math.max(max - 1, 0))}…`;
  return kept.join('\n');
}
