import type { StackEnv } from '../api/types';

/** Variable being edited: the key keeps a row stable while its name is typed. */
export interface EnvDraft {
  key: string;
  name: string;
  value: string;
}

let nextKey = 0;

export function toDrafts(env: StackEnv[] | null): EnvDraft[] {
  return (env ?? []).map((variable) => ({ key: `env-${nextKey++}`, ...variable }));
}

export function emptyDraft(): EnvDraft {
  return { key: `env-${nextKey++}`, name: '', value: '' };
}

/** What Compose accepts as a variable name in `${…}` substitution. */
const VALID_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Problems per row key, empty when the drafts can be saved. A row left
 * entirely blank is ignored rather than reported: it's an unfinished "add".
 */
export function validateEnv(drafts: EnvDraft[]): Map<string, string> {
  const errors = new Map<string, string>();
  const seen = new Map<string, string>();
  for (const draft of drafts) {
    const name = draft.name.trim();
    if (name === '' && draft.value === '') continue;
    if (name === '') errors.set(draft.key, 'Name required.');
    else if (!VALID_NAME.test(name)) {
      errors.set(draft.key, 'Letters, digits and _ only, not starting with a digit.');
    } else if (seen.has(name)) errors.set(draft.key, `${name} is already defined above.`);
    else seen.set(name, draft.key);
  }
  return errors;
}

/**
 * Variables to send. Names are trimmed; values go exactly as typed: leading
 * spaces, quotes or line breaks can be meaningful to the service reading them.
 */
export function fromDrafts(drafts: EnvDraft[]): StackEnv[] {
  return drafts
    .filter((draft) => draft.name.trim() !== '' || draft.value !== '')
    .map((draft) => ({ name: draft.name.trim(), value: draft.value }));
}

export interface EnvDiff {
  added: string[];
  changed: string[];
  removed: string[];
}

/** What a save changes, shown before redeploying. */
export function diffEnv(before: StackEnv[] | null, after: StackEnv[]): EnvDiff {
  const previous = new Map((before ?? []).map((variable) => [variable.name, variable.value]));
  const next = new Map(after.map((variable) => [variable.name, variable.value]));
  return {
    added: after.filter((v) => !previous.has(v.name)).map((v) => v.name),
    changed: after
      .filter((v) => previous.has(v.name) && previous.get(v.name) !== v.value)
      .map((v) => v.name),
    removed: [...previous.keys()].filter((name) => !next.has(name)),
  };
}

export function isEmptyDiff(diff: EnvDiff): boolean {
  return diff.added.length + diff.changed.length + diff.removed.length === 0;
}
