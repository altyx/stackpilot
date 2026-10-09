import { diffEnv, emptyDraft, fromDrafts, isEmptyDiff, toDrafts, validateEnv } from './stackEnv';

describe('stack variable drafts', () => {
  it('round-trips variables, keeping values exactly as typed', () => {
    const env = [{ name: 'GREETING', value: '  "hello"\nworld ' }];
    const drafts = toDrafts(env);
    expect(drafts[0].key).toMatch(/^env-/);
    expect(fromDrafts(drafts)).toEqual(env);
  });

  it('trims names and drops rows left blank', () => {
    const drafts = [{ key: 'a', name: '  DB_HOST ', value: 'db' }, { ...emptyDraft() }];
    expect(fromDrafts(drafts)).toEqual([{ name: 'DB_HOST', value: 'db' }]);
  });
});

describe('validateEnv', () => {
  it('reports missing, invalid and duplicate names per row', () => {
    const errors = validateEnv([
      { key: 'ok', name: 'PORT', value: '80' },
      { key: 'missing', name: ' ', value: 'x' },
      { key: 'invalid', name: '1BAD-NAME', value: '' },
      { key: 'dup', name: 'PORT', value: '81' },
      { key: 'blank', name: '', value: '' },
    ]);
    expect([...errors.keys()]).toEqual(['missing', 'invalid', 'dup']);
    expect(errors.get('dup')).toBe('PORT is already defined above.');
  });
});

describe('diffEnv', () => {
  it('lists added, changed and removed names', () => {
    const diff = diffEnv(
      [
        { name: 'KEEP', value: '1' },
        { name: 'CHANGE', value: 'old' },
        { name: 'DROP', value: 'x' },
      ],
      [
        { name: 'KEEP', value: '1' },
        { name: 'CHANGE', value: 'new' },
        { name: 'ADD', value: 'y' },
      ],
    );
    expect(diff).toEqual({ added: ['ADD'], changed: ['CHANGE'], removed: ['DROP'] });
    expect(isEmptyDiff(diff)).toBe(false);
    expect(isEmptyDiff(diffEnv(null, []))).toBe(true);
  });
});
