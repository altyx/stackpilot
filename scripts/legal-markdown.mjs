// Publie les textes légaux de l'app en Markdown dans docs/legal.
//
// L'app affiche src/legal ; les stores exigent une URL publique pour la
// politique de confidentialité. Générer l'une depuis l'autre garantit que les
// deux disent la même chose.
//
//   npm run legal              régénère docs/legal
//   npm run legal -- --check   échoue si docs/legal n'est plus à jour (CI)

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import path from 'node:path';

// Node exécute les .ts en retirant les types, mais exige l'extension dans les
// imports ; src/legal importe sans, comme le permet Metro.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && path.extname(specifier) === '') {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const { TERMS } = await import('../src/legal/terms.ts');
const { PRIVACY } = await import('../src/legal/privacy.ts');

const ROOT = path.resolve(import.meta.dirname, '..');
const OUTPUTS = [
  { file: 'docs/legal/terms.md', document: TERMS },
  { file: 'docs/legal/privacy.md', document: PRIVACY },
];

/** Neutralise la syntaxe Markdown : le texte doit s'afficher tel qu'écrit. */
function escape(text) {
  return text.replace(/[\\`*_[\]<>]/g, '\\$&');
}

function toMarkdown(document) {
  const lines = [
    '<!-- Généré par scripts/legal-markdown.mjs depuis src/legal : ne pas modifier à la main. -->',
    '',
    `# ${escape(document.title)}`,
    '',
    `_Dernière mise à jour : ${escape(document.updatedAt)}_`,
    '',
    escape(document.intro),
  ];
  document.sections.forEach((section, index) => {
    lines.push('', `## ${index + 1}. ${escape(section.title)}`);
    for (const block of section.body) {
      lines.push('');
      if (typeof block === 'string') lines.push(escape(block));
      else lines.push(...block.map((item) => `- ${escape(item)}`));
    }
  });
  return `${lines.join('\n')}\n`;
}

const check = process.argv.includes('--check');
const stale = [];

for (const { file, document } of OUTPUTS) {
  const target = path.join(ROOT, file);
  const expected = toMarkdown(document);
  if (check) {
    const current = await readFile(target, 'utf8').catch(() => null);
    if (current !== expected) stale.push(file);
    continue;
  }
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, expected);
  console.log(`${file} généré`);
}

if (stale.length > 0) {
  console.error(`Textes légaux publiés à régénérer (npm run legal) : ${stale.join(', ')}`);
  process.exit(1);
}
