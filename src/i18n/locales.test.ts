import en from './locales/en.json';
import fr from './locales/fr.json';

/** Leaf keys, plural suffixes dropped: each language has its own plural forms. */
function keys(node: object, prefix = ''): string[] {
  return Object.entries(node).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === 'object' && !Array.isArray(value)
      ? keys(value as object, path)
      : [path.replace(/_(zero|one|two|few|many|other)$/, '')];
  });
}

describe('catalogs', () => {
  it('give French every key of English, and nothing more', () => {
    expect([...new Set(keys(fr))].sort()).toEqual([...new Set(keys(en))].sort());
  });
});
