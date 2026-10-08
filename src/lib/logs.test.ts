import {
  formatLogText,
  formatLogTime,
  MAX_LOG_LINES,
  mergeLogLines,
  parseLogLines,
  sinceParam,
  stripFrameHeaders,
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

  it('drops terminal colour codes', () => {
    expect(parseLogLines('2026-10-08T01:00:00Z \u001b[31m [ERROR] Failed\u001b[0m\n')).toEqual([
      line('2026-10-08T01:00:00Z', ' [ERROR] Failed'),
    ]);
  });

  it('keeps a line without timestamp as is, and empty messages', () => {
    expect(parseLogLines('no stamp\n2026-10-07T12:00:00Z')).toEqual([
      line('', 'no stamp'),
      line('2026-10-07T12:00:00Z', ''),
    ]);
  });
});

describe('stripFrameHeaders', () => {
  /**
   * A Docker block as it reaches the app: real bytes (stream, padding, size
   * in bytes, body), then read as UTF-8 text like `response.text()` does.
   */
  function frames(...blocks: [stream: number, text: string][]): string {
    const bytes = Buffer.concat(
      blocks.map(([stream, text]) => {
        const body = Buffer.from(text, 'utf8');
        const header = Buffer.alloc(8);
        header[0] = stream;
        header.writeUInt32BE(body.length, 4);
        return Buffer.concat([header, body]);
      }),
    );
    return new TextDecoder().decode(bytes);
  }

  const stamp = (n: number) => `2026-10-08T09:00:0${n}.000000001Z`;

  it('keeps every line when a block is longer than 127 bytes', () => {
    // The size byte (0xA9) is no valid UTF-8 on its own: it decodes to U+FFFD.
    const long = 'x'.repeat(140);
    const raw = frames(
      [1, `${stamp(0)} short\n`],
      [1, `${stamp(1)} ${long}\n`],
      [2, `${stamp(2)} end\n`],
    );
    expect(parseLogLines(stripFrameHeaders(raw)).map((line) => line.text)).toEqual([
      'short',
      long,
      'end',
    ]);
  });

  it('keeps accents and emoji, whose bytes outnumber their characters', () => {
    const raw = frames([1, `${stamp(0)} démarré ✅ 🚀\n`], [1, `${stamp(1)} prêt\n`]);
    expect(parseLogLines(stripFrameHeaders(raw)).map((line) => line.text)).toEqual([
      'démarré ✅ 🚀',
      'prêt',
    ]);
  });

  it('handles a size whose last byte reads as a digit', () => {
    // 50 bytes: the size ends with 0x32, the character "2", like the year.
    const text = `${stamp(0)} ${'y'.repeat(50 - stamp(0).length - 2)}\n`;
    expect(Buffer.byteLength(text)).toBe(50);
    expect(parseLogLines(stripFrameHeaders(frames([1, text])))[0].text).toBe(
      'y'.repeat(50 - stamp(0).length - 2),
    );
  });

  it('keeps several lines sent in one block', () => {
    const raw = frames([1, `${stamp(0)} a\n${stamp(1)} b\n`]);
    expect(parseLogLines(stripFrameHeaders(raw)).map((line) => line.text)).toEqual(['a', 'b']);
  });

  it('leaves TTY output, which has no headers, untouched', () => {
    const raw = `${stamp(0)} plain\r\n${stamp(1)} text\r\n`;
    expect(stripFrameHeaders(raw)).toBe(raw);
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
