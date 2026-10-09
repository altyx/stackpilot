import { PortainerError, request, requestAnonymous, requestText } from './client';
import {
  fetchContainerLogs,
  fetchContainerStats,
  fetchDiskUsage,
  fetchDockerInfo,
  fetchImageStatus,
  fetchStackFile,
  fetchStackImageStatus,
  fetchStatus,
  listContainers,
  listStacks,
  listVolumes,
  loginWithApiKey,
  loginWithPassword,
  normalizeImageStatus,
  pruneImages,
  pruneVolumes,
  recreateContainer,
  redeployStack,
  removeContainer,
  removeImage,
  removeVolume,
  runContainerAction,
} from './portainer';
import type { PortainerStack, Session } from './types';
import { makeStack } from '../testing/fixtures';

jest.mock('./client', () => ({
  ...jest.requireActual<typeof import('./client')>('./client'),
  request: jest.fn(),
  requestAnonymous: jest.fn(),
  requestText: jest.fn(),
}));

const requestMock = jest.mocked(request);
const anonymousMock = jest.mocked(requestAnonymous);
const textMock = jest.mocked(requestText);
const session: Session = { baseUrl: 'https://portainer.lan', mode: 'apiKey', token: 'ptr_x' };

describe('fetchStatus', () => {
  it('pings the normalized instance anonymously', async () => {
    anonymousMock.mockResolvedValue({ Version: '2.27' });
    await expect(fetchStatus('portainer.lan/')).resolves.toEqual({ Version: '2.27' });
    expect(anonymousMock).toHaveBeenCalledWith('https://portainer.lan', { path: '/status' });
  });
});

describe('loginWithPassword', () => {
  it('exchanges credentials for a JWT session', async () => {
    anonymousMock.mockResolvedValue({ jwt: 'token' });
    await expect(loginWithPassword('portainer.lan', 'admin', 'pw')).resolves.toEqual({
      baseUrl: 'https://portainer.lan',
      mode: 'jwt',
      token: 'token',
      username: 'admin',
    });
    expect(anonymousMock).toHaveBeenCalledWith('https://portainer.lan', {
      method: 'POST',
      path: '/auth',
      body: { username: 'admin', password: 'pw' },
    });
  });

  it('rejects a response without a token', async () => {
    anonymousMock.mockResolvedValue({});
    await expect(loginWithPassword('portainer.lan', 'admin', 'pw')).rejects.toThrow(PortainerError);
  });
});

describe('loginWithApiKey', () => {
  it('validates the trimmed token against a protected route', async () => {
    requestMock.mockResolvedValue([]);
    await expect(loginWithApiKey('portainer.lan', ' ptr_x ')).resolves.toEqual(session);
    expect(requestMock).toHaveBeenCalledWith(session, { path: '/endpoints' });
  });
});

describe('Docker proxy routes', () => {
  it('lists every container of an environment', async () => {
    requestMock.mockResolvedValue([]);
    await listContainers(session, 3);
    expect(requestMock).toHaveBeenCalledWith(session, {
      path: '/endpoints/3/docker/containers/json',
      query: { all: true },
    });
  });

  it('refuses a non-integer environment id before calling the API', () => {
    expect(() => listContainers(session, Number.NaN)).toThrow(PortainerError);
    expect(requestMock).not.toHaveBeenCalled();
  });

  it('reads an empty volume list as an empty array', async () => {
    requestMock.mockResolvedValue({ Volumes: null, Warnings: null });
    await expect(listVolumes(session, 3)).resolves.toEqual([]);
  });

  it('accepts 304 for container actions, with a longer timeout', async () => {
    requestMock.mockResolvedValue(undefined);
    await runContainerAction(session, 3, 'abc', 'stop');
    expect(requestMock).toHaveBeenCalledWith(session, {
      method: 'POST',
      path: '/endpoints/3/docker/containers/abc/stop',
      timeoutMs: 30_000,
      accept: [304],
    });
  });

  it('fetches the log tail with timestamps, as parsed lines', async () => {
    // Docker frame: stream byte, 3 padding bytes, 4-byte big-endian size.
    const text = '2026-10-07T12:00:00Z hello\n';
    textMock.mockResolvedValue(
      `\u0001\u0000\u0000\u0000\u0000\u0000\u0000${String.fromCharCode(text.length)}${text}`,
    );
    await expect(fetchContainerLogs(session, 3, 'abc', { tail: 50 })).resolves.toEqual([
      { timestamp: '2026-10-07T12:00:00Z', text: 'hello' },
    ]);
    expect(textMock).toHaveBeenCalledWith(session, {
      path: '/endpoints/3/docker/containers/abc/logs',
      query: { stdout: 1, stderr: 1, timestamps: 1, tail: 50, since: undefined },
      timeoutMs: 30_000,
    });
  });

  it('reads the lines since a point in time', async () => {
    textMock.mockResolvedValue('');
    await expect(fetchContainerLogs(session, 3, 'abc', { since: '1791374400.5' })).resolves.toEqual(
      [],
    );
    expect(textMock).toHaveBeenLastCalledWith(
      session,
      expect.objectContaining({
        query: { stdout: 1, stderr: 1, timestamps: 1, tail: undefined, since: '1791374400.5' },
      }),
    );
  });
});

describe('stacks', () => {
  it('keeps the stacks of the environment, whatever their type', async () => {
    requestMock.mockResolvedValue([
      { Id: 1, Name: 'blog', Type: 2, EndpointId: 3 },
      { Id: 2, Name: 'mesh', Type: 1, EndpointId: 3 },
      { Id: 3, Name: 'other', Type: 2, EndpointId: 4 },
    ]);
    await expect(listStacks(session, 3)).resolves.toMatchObject([{ Id: 1 }, { Id: 2 }]);
    expect(requestMock).toHaveBeenCalledWith(session, { path: '/stacks' });
  });

  it("reads Portainer's empty 204 as no stack", async () => {
    requestMock.mockResolvedValue(undefined);
    await expect(listStacks(session, 3)).resolves.toEqual([]);
  });

  it('unwraps the Compose file content', async () => {
    requestMock.mockResolvedValue({ StackFileContent: 'services: {}' });
    await expect(fetchStackFile(session, 7)).resolves.toBe('services: {}');
    expect(requestMock).toHaveBeenCalledWith(session, { path: '/stacks/7/file' });
  });
});

describe('Portainer-side Docker routes', () => {
  it('reads the image status from the Business Edition indicator', async () => {
    requestMock.mockResolvedValue({ Status: 'outdated', Message: '' });
    await expect(fetchImageStatus(session, 3, 'abc')).resolves.toBe('outdated');
    expect(requestMock).toHaveBeenCalledWith(session, {
      path: '/docker/3/containers/abc/image_status',
      timeoutMs: 30_000,
    });
  });

  it('recreates a container with a pulled image, waiting long enough for the pull', async () => {
    requestMock.mockResolvedValue({ Id: 'new' });
    await expect(recreateContainer(session, 3, 'abc', true)).resolves.toEqual({ Id: 'new' });
    expect(requestMock).toHaveBeenCalledWith(session, {
      method: 'POST',
      path: '/docker/3/containers/abc/recreate',
      body: { PullImage: true },
      timeoutMs: 300_000,
    });
  });

  it('refuses a non-integer environment id before calling the API', () => {
    expect(() => recreateContainer(session, 1.5, 'abc', true)).toThrow(PortainerError);
    expect(requestMock).not.toHaveBeenCalled();
  });
});

describe('normalizeImageStatus', () => {
  it('keeps the two decided states and folds the rest', () => {
    expect(normalizeImageStatus('updated')).toBe('updated');
    expect(normalizeImageStatus('outdated')).toBe('outdated');
    expect(normalizeImageStatus('processing')).toBe('processing');
    expect(normalizeImageStatus('inprocess')).toBe('processing');
    expect(normalizeImageStatus('error')).toBe('unknown');
    expect(normalizeImageStatus(undefined)).toBe('unknown');
  });
});

describe('removeImage', () => {
  it('deletes the image, forcing only when asked', async () => {
    requestMock.mockResolvedValue([{ Deleted: 'sha256:abc' }]);
    await expect(removeImage(session, 1, 'sha256:abc', false)).resolves.toEqual([
      { Deleted: 'sha256:abc' },
    ]);
    expect(requestMock).toHaveBeenLastCalledWith(session, {
      method: 'DELETE',
      path: '/endpoints/1/docker/images/sha256%3Aabc',
      query: { force: undefined },
      timeoutMs: 60_000,
    });

    await removeImage(session, 1, 'sha256:abc', true);
    expect(requestMock).toHaveBeenLastCalledWith(
      session,
      expect.objectContaining({ query: { force: true } }),
    );
  });

  it('explains a conflict as a container still using the image', async () => {
    requestMock.mockRejectedValue(new PortainerError('Conflit', 409, 'image is being used'));
    await expect(removeImage(session, 1, 'sha256:abc', false)).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining('Image in use') as unknown,
      detail: 'image is being used',
    });
  });

  it('lets other errors through untouched', async () => {
    const error = new PortainerError('Resource not found on this instance.', 404);
    requestMock.mockRejectedValue(error);
    await expect(removeImage(session, 1, 'sha256:abc', false)).rejects.toBe(error);
  });

  it('rejects an invalid environment id before calling Portainer', async () => {
    requestMock.mockClear();
    await expect(removeImage(session, Number.NaN, 'sha256:abc', false)).rejects.toThrow(
      /Invalid environment id/,
    );
    expect(requestMock).not.toHaveBeenCalled();
  });
});

describe('pruneImages', () => {
  it('maps the scope to the dangling filter', async () => {
    requestMock.mockResolvedValue({ ImagesDeleted: [{ Deleted: 'sha256:a' }], SpaceReclaimed: 42 });
    await expect(pruneImages(session, 1, 'dangling')).resolves.toEqual({
      deleted: [{ Deleted: 'sha256:a' }],
      spaceReclaimed: 42,
    });
    expect(requestMock).toHaveBeenLastCalledWith(session, {
      method: 'POST',
      path: '/endpoints/1/docker/images/prune',
      query: { filters: '{"dangling":["true"]}' },
      timeoutMs: 180_000,
    });

    await pruneImages(session, 1, 'unused');
    expect(requestMock).toHaveBeenLastCalledWith(
      session,
      expect.objectContaining({ query: { filters: '{"dangling":["false"]}' } }),
    );
  });

  it('treats an empty response as nothing deleted', async () => {
    requestMock.mockResolvedValue(undefined);
    await expect(pruneImages(session, 1, 'dangling')).resolves.toEqual({
      deleted: [],
      spaceReclaimed: 0,
    });
  });

  it('treats a null deletion list as nothing deleted', async () => {
    requestMock.mockResolvedValue({ ImagesDeleted: null, SpaceReclaimed: 0 });
    await expect(pruneImages(session, 1, 'unused')).resolves.toEqual({
      deleted: [],
      spaceReclaimed: 0,
    });
  });
});

describe('overview readings', () => {
  it('reads the host info and disk usage through the Docker proxy', async () => {
    requestMock.mockResolvedValue({ NCPU: 4, MemTotal: 8 });
    await fetchDockerInfo(session, 2);
    expect(requestMock).toHaveBeenLastCalledWith(session, { path: '/endpoints/2/docker/info' });

    requestMock.mockResolvedValue({ LayersSize: 1 });
    await fetchDiskUsage(session, 2);
    expect(requestMock).toHaveBeenLastCalledWith(session, {
      path: '/endpoints/2/docker/system/df',
      timeoutMs: 60_000,
    });
  });

  it('asks for a single stats reading, not a stream', async () => {
    requestMock.mockResolvedValue({});
    await fetchContainerStats(session, 2, 'abc');
    expect(requestMock).toHaveBeenLastCalledWith(session, {
      path: '/endpoints/2/docker/containers/abc/stats',
      query: { stream: false },
      timeoutMs: 20_000,
    });
  });
});

describe('removeContainer', () => {
  it('forces and removes volumes only when asked', async () => {
    requestMock.mockResolvedValue(undefined);
    await removeContainer(session, 1, 'abc', { force: false, removeVolumes: false });
    expect(requestMock).toHaveBeenLastCalledWith(session, {
      method: 'DELETE',
      path: '/endpoints/1/docker/containers/abc',
      query: { force: undefined, v: undefined },
      timeoutMs: 60_000,
    });

    await removeContainer(session, 1, 'abc', { force: true, removeVolumes: true });
    expect(requestMock).toHaveBeenLastCalledWith(
      session,
      expect.objectContaining({ query: { force: true, v: true } }),
    );
  });
});

describe('removeVolume', () => {
  it('deletes the volume, never forcing it', async () => {
    requestMock.mockResolvedValue(undefined);
    await removeVolume(session, 1, 'pg data');
    expect(requestMock).toHaveBeenLastCalledWith(session, {
      method: 'DELETE',
      path: '/endpoints/1/docker/volumes/pg%20data',
      timeoutMs: 60_000,
    });
  });

  it('explains a conflict as a container still using the volume', async () => {
    requestMock.mockRejectedValue(new PortainerError('Conflit', 409, 'volume is in use'));
    await expect(removeVolume(session, 1, 'pgdata')).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining('Volume in use') as unknown,
      detail: 'volume is in use',
    });
  });
});

describe('pruneVolumes', () => {
  it('prunes anonymous volumes by default and named ones with all', async () => {
    requestMock.mockResolvedValue({ VolumesDeleted: ['a'], SpaceReclaimed: 10 });
    await expect(pruneVolumes(session, 1, 'anonymous')).resolves.toEqual({
      deleted: ['a'],
      spaceReclaimed: 10,
    });
    expect(requestMock).toHaveBeenLastCalledWith(session, {
      method: 'POST',
      path: '/endpoints/1/docker/volumes/prune',
      query: undefined,
      timeoutMs: 180_000,
    });

    await pruneVolumes(session, 1, 'all');
    expect(requestMock).toHaveBeenLastCalledWith(
      session,
      expect.objectContaining({ query: { filters: '{"all":["true"]}' } }),
    );
  });

  it('treats a null list as nothing deleted', async () => {
    requestMock.mockResolvedValue({ VolumesDeleted: null, SpaceReclaimed: 0 });
    await expect(pruneVolumes(session, 1, 'all')).resolves.toEqual({
      deleted: [],
      spaceReclaimed: 0,
    });
  });
});

describe('redeployStack', () => {
  const env = [{ name: 'TZ', value: 'UTC' }];

  it('sends the stored file back with the variables, pulling when asked', async () => {
    requestMock
      .mockResolvedValueOnce({ StackFileContent: 'services: {}' })
      .mockResolvedValueOnce(undefined);
    await redeployStack(session, makeStack({ Id: 7, EndpointId: 3, Env: env }), {
      pullImages: true,
    });
    expect(requestMock).toHaveBeenLastCalledWith(session, {
      method: 'PUT',
      path: '/stacks/7',
      query: { endpointId: 3 },
      body: {
        StackFileContent: 'services: {}',
        Env: env,
        Prune: false,
        PullImage: true,
        RepullImageAndRedeploy: true,
      },
      timeoutMs: 300_000,
    });
  });

  it('uses the Git route for a repository stack, keeping stored credentials', async () => {
    requestMock.mockResolvedValue(undefined);
    const stack: PortainerStack = makeStack({
      Id: 7,
      EndpointId: 3,
      GitConfig: { URL: 'u', ReferenceName: 'refs/heads/main', ConfigFilePath: 'c' },
    });
    await redeployStack(session, stack, { pullImages: false, env });
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenLastCalledWith(session, {
      method: 'PUT',
      path: '/stacks/7/git/redeploy',
      query: { endpointId: 3 },
      body: {
        Env: env,
        Prune: false,
        PullImage: false,
        RepullImageAndRedeploy: false,
        RepositoryReferenceName: 'refs/heads/main',
        RepositoryAuthentication: false,
      },
      timeoutMs: 300_000,
    });
  });

  it('refuses to redeploy from an empty file', async () => {
    requestMock.mockClear();
    requestMock.mockResolvedValueOnce({ StackFileContent: '' });
    await expect(redeployStack(session, makeStack(), { pullImages: false })).rejects.toThrow(
      /stack file is empty/,
    );
    expect(requestMock).toHaveBeenCalledTimes(1);
  });
});

describe('fetchStackImageStatus', () => {
  it("normalises the stack's image status", async () => {
    requestMock.mockResolvedValue({ Status: 'inprocess', Message: '' });
    await expect(fetchStackImageStatus(session, 7)).resolves.toBe('processing');
    expect(requestMock).toHaveBeenLastCalledWith(session, {
      path: '/stacks/7/images_status',
      timeoutMs: 60_000,
    });
  });
});
