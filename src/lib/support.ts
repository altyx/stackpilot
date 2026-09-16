import { SOURCE_CODE_URL } from '../legal/publisher';
import { diagnostics } from './appInfo';

export const RELEASES_URL = `${SOURCE_CODE_URL}/releases`;

/**
 * Formulaire d'issue GitHub pré-rempli : le rapport part avec la version exacte
 * et l'appareil, que l'utilisateur ne sait généralement pas retrouver.
 *
 * Le corps est pré-rempli, pas envoyé : l'utilisateur le relit, le complète et
 * le publie lui-même. Il ne contient donc que ce que `diagnostics` autorise —
 * rien de son instance Portainer.
 */
export function newIssueUrl(): string {
  const body = [
    '### Problème rencontré',
    '',
    '',
    '### Étapes pour le reproduire',
    '',
    '1. ',
    '',
    '### Contexte',
    '',
    diagnostics(),
    '',
  ].join('\n');
  return `${SOURCE_CODE_URL}/issues/new?body=${encodeURIComponent(body)}`;
}
