import {
  formatLogText,
  formatLogTime,
  MAX_LOG_LINES,
  mergeLogLines,
  parseLogLines,
  sinceParam,
  type LogLine,
} from './logs';

const line = (timestamp: string, text: string): LogLine => ({ timestamp, text });

describe('parseLogLines', () => {
  it('splits the timestamp Docker prefixes each line with', () => {
    expect(
      parseLogLines('2026-10-07T12:00:00.123456789Z started\r\n2026-10-07T12:00:01Z ready\n\n'),
    ).toEqual([
      line('2026-10-07T12:00:00.123456789Z', 'started'),
      line('2026-10-07T12:00:01Z', 'ready'),
    ]);
  });

  it('keeps a line without timestamp as is, and empty messages', () => {
    expect(parseLogLines('no stamp\n2026-10-07T12:00:00Z')).toEqual([
      line('', 'no stamp'),
      line('2026-10-07T12:00:00Z', ''),
    ]);
  });
});

describe('mergeLogLines', () => {
  const t1 = '2026-10-07T12:00:01.000000001Z';
  const t2 = '2026-10-07T12:00:02.000000001Z';

  it('appends newer lines and drops the repeated ones at the last timestamp', () => {
    const current = [line(t1, 'a'), line(t2, 'b')];
    const merged = mergeLogLines(current, [line(t2, 'b'), line(t2, 'c'), line(t1, 'old')]);
    expect(merged).toEqual([line(t1, 'a'), line(t2, 'b'), line(t2, 'c')]);
  });

  it('returns the same list when nothing is new, to skip a render', () => {
    const current = [line(t1, 'a')];
    expect(mergeLogLines(current, [line(t1, 'a')])).toBe(current);
  });

  it('starts from the incoming lines when empty', () => {
    expect(mergeLogLines([], [line(t1, 'a')])).toEqual([line(t1, 'a')]);
  });

  it('keeps only the most recent lines past the cap', () => {
    const many = Array.from({ length: MAX_LOG_LINES }, (_, i) =>
      line(`2026-10-07T12:00:00.${String(i).padStart(9, '0')}Z`, String(i)),
    );
    const merged = mergeLogLines(many, [line('2026-10-07T13:00:00Z', 'new')]);
    expect(merged).toHaveLength(MAX_LOG_LINES);
    expect(merged[0].text).toBe('1');
    expect(merged.at(-1)?.text).toBe('new');
  });
});

describe('sinceParam', () => {
  it('keeps the fraction so a poll resumes at the exact line', () => {
    expect(sinceParam('2026-10-07T12:00:00.123456789Z')).toBe('1791374400.123456789');
    expect(sinceParam('2026-10-07T12:00:00Z')).toBe('1791374400');
    expect(sinceParam('2026-10-07T14:00:00.5+02:00')).toBe('1791374400.5');
    expect(sinceParam('garbage')).toBeUndefined();
  });
});

describe('formatLogTime and formatLogText', () => {
  it('shows a local time with milliseconds', () => {
    expect(formatLogTime('2026-10-07T12:00:01.234567Z')).toMatch(/^\d{2}:\d{2}:01\.234$/);
    expect(formatLogTime('')).toBe('');
  });

  it('joins lines, with full timestamps only when asked', () => {
    const lines = [line('2026-10-07T12:00:00Z', 'a'), line('', 'b')];
    expect(formatLogText(lines, false)).toBe('a\nb');
    expect(formatLogText(lines, true)).toBe('2026-10-07T12:00:00Z a\nb');
  });
});
