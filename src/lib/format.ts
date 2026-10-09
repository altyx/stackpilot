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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * "16 Sep 2026, 14:05", in local time. The month is spelled out because a
 * numeric date reads differently on either side of the Atlantic, and the
 * string is built by hand because engines disagree on English abbreviations
 * ("Sep" or "Sept") and on the 24-hour clock.
 */
export function formatDate(value: string | number): string {
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  return `${day}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const STATE_LABELS: Record<string, string> = {
  created: 'Created',
  running: 'Running',
  paused: 'Paused',
  restarting: 'Restarting',
  removing: 'Removing',
  exited: 'Stopped',
  dead: 'Dead',
};

export function stateLabel(state: string): string {
  return STATE_LABELS[state] ?? state;
}

/** Docker sizes in base 1000, as `docker system df` displays them. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'kB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log10(bytes) / 3), units.length - 1);
  const value = bytes / 1000 ** exponent;
  return `${value.toFixed(value >= 100 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

/** "1 image", "0 images", "3 images": English counts every number but one as plural. */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
