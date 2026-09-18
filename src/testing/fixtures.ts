import {
  EndpointType,
  type ContainerSummary,
  type Endpoint,
  type ImageSummary,
  type VolumeSummary,
} from '../api/types';

/** Minimal Docker/Portainer payloads for tests; override only what matters. */
export function makeContainer(overrides: Partial<ContainerSummary> = {}): ContainerSummary {
  return {
    Id: 'a1b2c3d4e5f6a7b8c9d0',
    Names: ['/web'],
    Image: 'nginx:1.27',
    ImageID: 'sha256:1111111111111111',
    Command: 'nginx -g daemon off;',
    Created: 1_757_000_000,
    State: 'running',
    Status: 'Up 2 hours',
    Ports: [],
    Labels: {},
    ...overrides,
  };
}

export function makeImage(overrides: Partial<ImageSummary> = {}): ImageSummary {
  return {
    Id: 'sha256:0123456789abcdef0123',
    ParentId: '',
    RepoTags: ['app:latest'],
    RepoDigests: [],
    Created: 1_757_000_000,
    Size: 1_000,
    SharedSize: 0,
    Labels: null,
    ...overrides,
  };
}

export function makeVolume(overrides: Partial<VolumeSummary> = {}): VolumeSummary {
  return {
    Name: 'data',
    Driver: 'local',
    Mountpoint: '/var/lib/docker/volumes/data/_data',
    Scope: 'local',
    Labels: null,
    Options: null,
    ...overrides,
  };
}

export function makeEndpoint(overrides: Partial<Endpoint> = {}): Endpoint {
  return {
    Id: 1,
    Name: 'local',
    Type: EndpointType.DockerLocal,
    URL: 'unix:///var/run/docker.sock',
    Status: 1,
    ...overrides,
  };
}
