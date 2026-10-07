import { makeContainerInspect } from '../testing/fixtures';
import { hasVolumeMounts, secondaryActions } from './containerActions';

const state = (overrides: Partial<ReturnType<typeof makeContainerInspect>['State']>) =>
  makeContainerInspect({ State: { ...makeContainerInspect().State, ...overrides } });

describe('secondaryActions', () => {
  it('offers pause, kill and remove on a running container', () => {
    expect(secondaryActions(state({ Running: true, Paused: false }))).toEqual([
      'pause',
      'kill',
      'remove',
    ]);
  });

  it('offers resume instead of pause on a paused one', () => {
    expect(secondaryActions(state({ Running: true, Paused: true }))).toEqual([
      'unpause',
      'kill',
      'remove',
    ]);
  });

  it('only offers removal on a stopped one', () => {
    expect(secondaryActions(state({ Running: false, Paused: false }))).toEqual(['remove']);
  });

  it("offers nothing on Portainer's own container", () => {
    expect(secondaryActions(makeContainerInspect({ IsPortainer: true }))).toEqual([]);
  });
});

describe('hasVolumeMounts', () => {
  it('ignores bind mounts', () => {
    const bind = { Type: 'bind', Source: '/srv', Destination: '/data', RW: true };
    expect(hasVolumeMounts(makeContainerInspect({ Mounts: [bind] }))).toBe(false);
    expect(hasVolumeMounts(makeContainerInspect({ Mounts: [{ ...bind, Type: 'volume' }] }))).toBe(
      true,
    );
  });
});
