// Vérifie que le changelog embarqué décrit bien la version compilée.
//
// C'est le binaire qui embarque `src/changelog.ts` : une note de version
// ajoutée après le tag n'atteindrait jamais les utilisateurs de cette version.
// Le workflow de publication lance donc ce contrôle avant de compiler.
//
//   npm run changelog

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
