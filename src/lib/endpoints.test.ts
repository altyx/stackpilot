import { EndpointType } from '../api/types';
import { makeEndpoint } from '../testing/fixtures';
import { isBrowsable, isKubernetes, isOnline, pickHomeEndpoint } from './endpoints';

describe('isKubernetes', () => {
  it('recognises every Kubernetes environment type', () => {
    expect(isKubernetes(makeEndpoint({ Type: EndpointType.KubernetesLocal }))).toBe(true);
    expect(isKubernetes(makeEndpoint({ Type: EndpointType.KubernetesEdgeAgent }))).toBe(true);
    expect(isKubernetes(makeEndpoint({ Type: EndpointType.DockerAgent }))).toBe(false);
  });
});

describe('isOnline', () => {
  it('reads Portainer status 1 as up', () => {
    expect(isOnline(makeEndpoint({ Status: 1 }))).toBe(true);
    expect(isOnline(makeEndpoint({ Status: 2 }))).toBe(false);
  });
});

describe('isBrowsable', () => {
  it('requires an online Docker environment', () => {
    expect(isBrowsable(makeEndpoint())).toBe(true);
    expect(isBrowsable(makeEndpoint({ Status: 2 }))).toBe(false);
    expect(isBrowsable(makeEndpoint({ Type: EndpointType.KubernetesLocal }))).toBe(false);
  });
});

describe('pickHomeEndpoint', () => {
  const endpoints = [
    makeEndpoint({ Id: 1, Name: 'offline', Status: 2 }),
    makeEndpoint({ Id: 2, Name: 'first-up' }),
    makeEndpoint({ Id: 3, Name: 'last-viewed' }),
  ];

  it('returns the last viewed environment when it is still reachable', () => {
    expect(pickHomeEndpoint(endpoints, 3)?.Name).toBe('last-viewed');
  });

  it('falls back to the first reachable one', () => {
    expect(pickHomeEndpoint(endpoints, 1)?.Name).toBe('first-up');
    expect(pickHomeEndpoint(endpoints, null)?.Name).toBe('first-up');
  });

  it('returns undefined when nothing is reachable', () => {
    expect(pickHomeEndpoint([makeEndpoint({ Status: 2 })], null)).toBeUndefined();
  });
});
