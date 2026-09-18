import appJson from '../app.json';
import { CHANGELOG, LATEST_RELEASE } from './changelog';

describe('changelog', () => {
  it('describes the version app.json ships', () => {
    expect(LATEST_RELEASE.version).toBe(appJson.expo.version);
  });

  it('lists each version once, with at least one note', () => {
    const versions = CHANGELOG.map((release) => release.version);
    expect(new Set(versions).size).toBe(versions.length);
    for (const release of CHANGELOG) {
      expect(release.changes.length).toBeGreaterThan(0);
    }
  });
});
