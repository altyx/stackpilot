import type { ContainerInspect, ContainerSummary } from '../api/types';

/** Docker prefixes names with a `/`; a container can have several. */
export function containerName(container: ContainerSummary): string {
  const raw = container.Names?.[0] ?? container.Id.slice(0, 12);
  return raw.replace(/^\//, '');
}

export function inspectName(container: ContainerInspect): string {
  return container.Name.replace(/^\//, '');
}

export function shortId(id: string): string {
  return id.slice(0, 12);
}

/** How a language writes dates, sizes and shares: see `src/i18n`. */
export interface LocaleFormat {
  /** Abbreviated month names, January first. */
  months: readonly string[];
  /** Joins the day ("16 Sep 2026") and the time ("14:05"). */
  dateTime: (day: string, time: string) => string;
  decimal: string;
  /** Byte units in base 1000, from the byte up. */
  byteUnits: readonly string[];
  percent: (value: string) => string;
}

/**
 * "16 Sep 2026, 14:05", in local time. The month is spelled out because a
 * numeric date reads differently on either side of the Atlantic, and the
 * string is built by hand because engines disagree on abbreviations ("Sep"
 * or "Sept") and on the 24-hour clock.
 */
export function formatDate(value: string | number, format: LocaleFormat): string {
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = `${date.getDate()} ${format.months[date.getMonth()]} ${date.getFullYear()}`;
  return format.dateTime(day, `${pad(date.getHours())}:${pad(date.getMinutes())}`);
}

/** Docker sizes in base 1000, as `docker system df` displays them. */
export function formatBytes(bytes: number, format: LocaleFormat): string {
  const units = format.byteUnits;
  if (!Number.isFinite(bytes) || bytes <= 0) return `0 ${units[0]}`;
  const exponent = Math.min(Math.floor(Math.log10(bytes) / 3), units.length - 1);
  const value = bytes / 1000 ** exponent;
  const digits = value.toFixed(value >= 100 || exponent === 0 ? 0 : 1);
  return `${digits.replace('.', format.decimal)} ${units[exponent]}`;
}

/** "12%" with one decimal below 10, where the decimal still tells something. */
export function formatPercent(value: number, format: LocaleFormat): string {
  const rounded = value < 10 ? value.toFixed(1) : String(Math.round(value));
  return format.percent(rounded.replace('.', format.decimal));
}
