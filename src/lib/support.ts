import { SOURCE_CODE_URL } from '../legal/publisher';
import { diagnostics } from './appInfo';

export const RELEASES_URL = `${SOURCE_CODE_URL}/releases`;

/**
 * Pre-filled GitHub issue form: the report starts with the exact version and
 * device, which the user usually can't find on their own.
 *
 * The body is pre-filled, not sent: the user reviews it, completes it and
 * publishes it themselves. It therefore only contains what `diagnostics`
 * allows — nothing about their Portainer instance.
 */
export function newIssueUrl(): string {
  const body = [
    '### What happened',
    '',
    '',
    '### Steps to reproduce',
    '',
    '1. ',
    '',
    '### Context',
    '',
    diagnostics(),
    '',
  ].join('\n');
  return `${SOURCE_CODE_URL}/issues/new?body=${encodeURIComponent(body)}`;
}
