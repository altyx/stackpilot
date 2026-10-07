export interface LogLine {
  /** RFC 3339 timestamp Docker prefixes each line with (`timestamps=1`). */
  timestamp: string;
  text: string;
}

export interface LogRange {
  key: string;
  label: string;
  /** Last N lines, or every line since `sinceSeconds` ago. */
  tail?: number;
  sinceSeconds?: number;
}

export const LOG_RANGES: readonly LogRange[] = [
  { key: 'tail-100', label: '100 lignes', tail: 100 },
  { key: 'tail-500', label: '500 lignes', tail: 500 },
  { key: 'tail-2000', label: '2 000 lignes', tail: 2000 },
  { key: 'since-15m', label: '15 min', sinceSeconds: 15 * 60 },
  { key: 'since-1h', label: '1 h', sinceSeconds: 60 * 60 },
  { key: 'since-24h', label: '24 h', sinceSeconds: 24 * 60 * 60 },
];

export const DEFAULT_LOG_RANGE = LOG_RANGES[1];

/**
 * Lines kept in memory while following: a chatty container would otherwise
 * grow the view until the phone chokes on rendering it.
 */
export const MAX_LOG_LINES = 5000;

/** "2026-10-07T12:00:00.123456789Z message" → timestamp and message. */
const TIMESTAMPED = /^(\d{4}-\d{2}-\d{2}T\S+)\s?(.*)$/;

/** Splits Docker's text output (already demultiplexed) into lines. */
export function parseLogLines(raw: string): LogLine[] {
  const lines: LogLine[] = [];
  for (const line of raw.split('\n')) {
    if (line === '') continue;
    const match = TIMESTAMPED.exec(line.replace(/\r$/, ''));
    lines.push(match ? { timestamp: match[1], text: match[2] } : { timestamp: '', text: line });
  }
  return lines;
}

/**
 * Appends lines read since the last one. Docker's `since` is inclusive, so
 * the poll repeats the lines sharing the last timestamp: those already shown
 * are dropped rather than doubled.
 */
export function mergeLogLines(current: LogLine[], incoming: LogLine[]): LogLine[] {
  const last = current.at(-1)?.timestamp;
  if (!last) return capLines([...current, ...incoming]);
  const seenAtLast = new Set(
    current.filter((line) => line.timestamp === last).map((line) => line.text),
  );
  const fresh = incoming.filter(
    (line) => line.timestamp > last || (line.timestamp === last && !seenAtLast.has(line.text)),
  );
  return fresh.length === 0 ? current : capLines([...current, ...fresh]);
}

function capLines(lines: LogLine[]): LogLine[] {
  return lines.length > MAX_LOG_LINES ? lines.slice(lines.length - MAX_LOG_LINES) : lines;
}

/**
 * Docker's `since` parameter for a line's timestamp: Unix seconds with the
 * fraction kept, so a poll resumes at the exact line rather than the second.
 */
export function sinceParam(timestamp: string): string | undefined {
  const match = /^(.+?)(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/.exec(timestamp);
  if (!match) return undefined;
  const seconds = Math.floor(Date.parse(`${match[1]}${match[3]}`) / 1000);
  if (!Number.isFinite(seconds)) return undefined;
  return match[2] ? `${seconds}.${match[2]}` : String(seconds);
}

/** "12:00:01.123" in local time: the date rarely matters while reading logs. */
export function formatLogTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number, width = 2) => String(n).padStart(width, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

/** Plain text to copy or share, with full timestamps when shown. */
export function formatLogText(lines: LogLine[], withTimestamps: boolean): string {
  return lines
    .map((line) =>
      withTimestamps && line.timestamp ? `${line.timestamp} ${line.text}` : line.text,
    )
    .join('\n');
}
