import type { ContainerInspect } from '../api/types';
import { makeContainer } from '../testing/fixtures';
import { en } from '../i18n/en';
import { fr } from '../i18n/fr';
import { containerName, inspectName, plural, pluralFr, shortId } from './format';

describe('containerName', () => {
  it('strips the leading slash Docker adds', () => {
    expect(containerName(makeContainer({ Names: ['/web'] }))).toBe('web');
  });

  it('falls back to the short id when the container has no name', () => {
    expect(containerName(makeContainer({ Id: 'abcdef0123456789', Names: [] }))).toBe(
      'abcdef012345',
    );
  });
});

describe('inspectName', () => {
  it('strips the leading slash', () => {
    expect(inspectName({ Name: '/db' } as ContainerInspect)).toBe('db');
  });
});

describe('shortId', () => {
  it('keeps the first 12 characters', () => {
    expect(shortId('abcdef0123456789abcdef')).toBe('abcdef012345');
  });
});

// The formatters are reached through the catalogs, which hold each language's conventions.
describe('formatDate', () => {
  it('reads Docker timestamps in seconds', () => {
    const formatted = en.date(Date.UTC(2026, 8, 16, 14, 5) / 1000);
    expect(formatted).toContain('16 Sep 2026');
    expect(formatted).toContain('14:05');
  });

  it('reads ISO strings', () => {
    expect(en.date('2026-09-16T14:05:00Z')).toContain('16 Sep 2026');
  });

  it('writes French dates with French months', () => {
    const formatted = fr.date(Date.UTC(2026, 8, 16, 14, 5) / 1000);
    expect(formatted).toContain('16 sept. 2026 à');
    expect(formatted).toContain('14:05');
  });

  it('shows a dash for an unreadable date', () => {
    expect(en.date('not a date')).toBe('—');
  });
});

describe('containerState', () => {
  it('translates known Docker states', () => {
    expect(en.containerState('running')).toBe('Running');
    expect(en.containerState('exited')).toBe('Stopped');
    expect(fr.containerState('exited')).toBe('Arrêté');
  });

  it('passes unknown states through', () => {
    expect(en.containerState('configured')).toBe('configured');
  });
});

describe('formatBytes', () => {
  it('uses base 1000 units with a decimal point', () => {
    expect(en.bytes(512)).toBe('512 B');
    expect(en.bytes(1_500)).toBe('1.5 kB');
    expect(en.bytes(2_000_000_000)).toBe('2.0 GB');
  });

  it('drops the decimal from three-digit values', () => {
    expect(en.bytes(100_000)).toBe('100 kB');
  });

  it('shows zero for empty or invalid sizes', () => {
    expect(en.bytes(0)).toBe('0 B');
    expect(en.bytes(-5)).toBe('0 B');
    expect(en.bytes(Number.NaN)).toBe('0 B');
  });

  it('writes French sizes with a decimal comma and French units', () => {
    expect(fr.bytes(1_500)).toBe('1,5 ko');
    expect(fr.bytes(0)).toBe('0 o');
  });
});

describe('formatPercent', () => {
  it('keeps a decimal only for small values', () => {
    expect(en.percent(3.24)).toBe('3.2%');
    expect(en.percent(42.6)).toBe('43%');
  });

  it('spaces the French percent sign, without letting it wrap', () => {
    expect(fr.percent(3.24)).toBe('3,2\u00a0%');
  });
});

describe('plural', () => {
  it('counts zero as plural in English and singular in French', () => {
    expect(plural(0, 'image')).toBe('0 images');
    expect(plural(1, 'image')).toBe('1 image');
    expect(pluralFr(0, 'image')).toBe('0 image');
    expect(pluralFr(1, 'image')).toBe('1 image');
    expect(pluralFr(2, 'image')).toBe('2 images');
  });
});
