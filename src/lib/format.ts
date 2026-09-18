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

export function formatDate(value: string | number): string {
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATE_LABELS: Record<string, string> = {
  created: 'Créé',
  running: 'En cours',
  paused: 'En pause',
  restarting: 'Redémarrage',
  removing: 'Suppression',
  exited: 'Arrêté',
  dead: 'Mort',
};

export function stateLabel(state: string): string {
  return STATE_LABELS[state] ?? state;
}

/** Docker sizes in base 1000, as `docker system df` displays them. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 o';
  const units = ['o', 'ko', 'Mo', 'Go', 'To'];
  const exponent = Math.min(Math.floor(Math.log10(bytes) / 3), units.length - 1);
  const value = bytes / 1000 ** exponent;
  return `${value.toFixed(value >= 100 || exponent === 0 ? 0 : 1).replace('.', ',')} ${units[exponent]}`;
}
