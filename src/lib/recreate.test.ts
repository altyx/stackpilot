import { makeContainerInspect } from '../testing/fixtures';
import { imageUpdateBlocker } from './recreate';

describe('imageUpdateBlocker', () => {
  it('allows a plain container built from a tagged image', () => {
    expect(imageUpdateBlocker(makeContainerInspect())).toBeNull();
  });

  it('names why Portainer itself, Swarm tasks and --rm containers are excluded', () => {
    expect(imageUpdateBlocker(makeContainerInspect({ IsPortainer: true }))).toMatch(/Portainer/);
    expect(
      imageUpdateBlocker(
        makeContainerInspect({
          Config: {
            Image: 'nginx:1.27',
            Env: null,
            Cmd: null,
            Labels: { 'com.docker.swarm.service.id': 'svc' },
          },
        }),
      ),
    ).toMatch(/Swarm/);
    expect(imageUpdateBlocker(makeContainerInspect({ HostConfig: { AutoRemove: true } }))).toMatch(
      /--rm/,
    );
  });

  it('has nothing to pull for an image referenced by digest only', () => {
    const digest = makeContainerInspect({
      Config: { Image: 'sha256:0123456789ab', Env: null, Cmd: null, Labels: {} },
    });
    expect(imageUpdateBlocker(digest)).toMatch(/tag/);
  });
});
