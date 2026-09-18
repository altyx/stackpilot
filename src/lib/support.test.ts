import { SOURCE_CODE_URL } from '../legal/publisher';
import { RELEASES_URL, newIssueUrl } from './support';

jest.mock('./appInfo', () => ({
  diagnostics: () => 'StackPilot 1.0.0 (7) · abc1234\niOS 19.0 · iPhone 17',
}));

describe('newIssueUrl', () => {
  it('opens a pre-filled issue on the public repository', () => {
    const url = newIssueUrl();
    const prefix = `${SOURCE_CODE_URL}/issues/new?body=`;
    expect(url.startsWith(prefix)).toBe(true);

    const body = decodeURIComponent(url.slice(prefix.length));
    expect(body).toContain('### Problème rencontré');
    expect(body).toContain('### Étapes pour le reproduire');
    expect(body).toContain('StackPilot 1.0.0 (7) · abc1234\niOS 19.0 · iPhone 17');
  });
});

describe('RELEASES_URL', () => {
  it('points at the GitHub releases page', () => {
    expect(RELEASES_URL).toBe(`${SOURCE_CODE_URL}/releases`);
  });
});
