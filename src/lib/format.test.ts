import type { ContainerInspect } from '../api/types';
import { makeContainer } from '../testing/fixtures';
import { containerName, formatBytes, formatDate, inspectName, shortId, stateLabel } from './format';

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

describe('formatDate', () => {
  it('reads Docker timestamps in seconds', () => {
    const formatted = formatDate(Date.UTC(2026, 8, 16, 14, 5) / 1000);
    expect(formatted).toContain('16 Sep 2026');
    expect(formatted).toContain('14:05');
  });

  it('reads ISO strings', () => {
    expect(formatDate('2026-09-16T14:05:00Z')).toContain('16 Sep 2026');
  });

  it('shows a dash for an unreadable date', () => {
    expect(formatDate('not a date')).toBe('—');
  });
});

describe('stateLabel', () => {
  it('translates known Docker states', () => {
    expect(stateLabel('running')).toBe('Running');
    expect(stateLabel('exited')).toBe('Stopped');
  });

  it('passes unknown states through', () => {
    expect(stateLabel('configured')).toBe('configured');
  });
});

describe('formatBytes', () => {
  it('uses base 1000 units with a decimal point', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1_500)).toBe('1.5 kB');
    expect(formatBytes(2_000_000_000)).toBe('2.0 GB');
  });

  it('drops the decimal from three-digit values', () => {
    expect(formatBytes(100_000)).toBe('100 kB');
  });

  it('shows zero for empty or invalid sizes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(-5)).toBe('0 B');
    expect(formatBytes(Number.NaN)).toBe('0 B');
  });
});
