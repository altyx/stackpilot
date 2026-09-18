import {
  PortainerError,
  normalizeBaseUrl,
  request,
  requestAnonymous,
  requestText,
  setUnauthorizedListener,
} from './client';
import type { Session } from './types';

const session: Session = { baseUrl: 'https://portainer.lan', mode: 'apiKey', token: 'ptr_secret' };

// The client always passes a string URL; typing the mock that way keeps the
// assertions simple.
const fetchMock = jest.fn<Promise<Response>, [string, RequestInit | undefined]>();

/** Only what `rawRequest` reads from a response. */
function fakeResponse(status: number, body = ''): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
  } as unknown as Response;
}

function lastCall(): {
  url: string;
  init: RequestInit | undefined;
  headers: Record<string, string>;
} {
  const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  return { url, init, headers: (init?.headers ?? {}) as Record<string, string> };
}

beforeEach(() => {
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe('normalizeBaseUrl', () => {
  it('adds https and strips trailing slashes and /api', () => {
    expect(normalizeBaseUrl('portainer.lan:9443/')).toBe('https://portainer.lan:9443');
    expect(normalizeBaseUrl('https://portainer.lan/API/')).toBe('https://portainer.lan');
    expect(normalizeBaseUrl('  http://10.0.0.2  ')).toBe('http://10.0.0.2');
  });

  it('rejects an empty address', () => {
    expect(() => normalizeBaseUrl('  ')).toThrow(PortainerError);
  });
});

describe('request', () => {
  it('targets /api, encodes the query and authenticates with the access token', async () => {
    fetchMock.mockResolvedValue(fakeResponse(200, JSON.stringify([{ Id: 1 }])));
    await expect(
      request(session, { path: '/endpoints', query: { all: true, tail: undefined, name: 'a b' } }),
    ).resolves.toEqual([{ Id: 1 }]);
    const { url, init, headers } = lastCall();
    expect(url).toBe('https://portainer.lan/api/endpoints?all=true&name=a%20b');
    expect(init?.method).toBe('GET');
    expect(headers['X-API-Key']).toBe('ptr_secret');
    expect(headers.Accept).toBe('application/json');
  });

  it('sends JSON bodies with a bearer token for JWT sessions', async () => {
    fetchMock.mockResolvedValue(fakeResponse(200, '{"jwt":"x"}'));
    await request(
      { ...session, mode: 'jwt', token: 'jwt-token' },
      { method: 'POST', path: 'auth', body: { username: 'u' } },
    );
    const { url, init, headers } = lastCall();
    expect(url).toBe('https://portainer.lan/api/auth');
    expect(init?.body).toBe('{"username":"u"}');
    expect(headers.Authorization).toBe('Bearer jwt-token');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('resolves to undefined on 204 or an empty body', async () => {
    fetchMock.mockResolvedValueOnce(fakeResponse(204));
    await expect(request(session, { path: '/x' })).resolves.toBeUndefined();
    fetchMock.mockResolvedValueOnce(fakeResponse(200, ''));
    await expect(request(session, { path: '/x' })).resolves.toBeUndefined();
  });

  it('maps HTTP errors to French messages and keeps the server detail', async () => {
    fetchMock.mockResolvedValue(
      fakeResponse(403, JSON.stringify({ message: 'Unauthorized', details: 'no access' })),
    );
    await expect(request(session, { path: '/x' })).rejects.toMatchObject({
      name: 'PortainerError',
      status: 403,
      message: "Accès refusé : ce compte n'a pas les droits sur cette ressource.",
      detail: 'Unauthorized',
    });
  });

  it('keeps a non-JSON body as the detail', async () => {
    fetchMock.mockResolvedValue(fakeResponse(500, 'boom'));
    await expect(request(session, { path: '/x' })).rejects.toMatchObject({
      status: 500,
      message: 'Erreur Portainer (HTTP 500).',
      detail: 'boom',
    });
  });

  it('treats accepted status codes as success', async () => {
    fetchMock.mockResolvedValue(fakeResponse(304));
    await expect(request(session, { path: '/x', accept: [304] })).resolves.toBeUndefined();
  });

  it('reports a 401 to the unauthorized listener, with the rejected token', async () => {
    const listener = jest.fn();
    const unsubscribe = setUnauthorizedListener(listener);
    fetchMock.mockResolvedValue(fakeResponse(401));
    await expect(request(session, { path: '/x' })).rejects.toMatchObject({ status: 401 });
    expect(listener).toHaveBeenCalledWith('ptr_secret');

    unsubscribe();
    await expect(request(session, { path: '/x' })).rejects.toMatchObject({ status: 401 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('turns a timeout into a readable error', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
          );
        }),
    );
    const pending = request(session, { path: '/slow', timeoutMs: 50 });
    const expectation = expect(pending).rejects.toMatchObject({
      message: "L'instance Portainer n'a pas répondu à temps.",
      detail: 'https://portainer.lan/api/slow',
    });
    jest.advanceTimersByTime(50);
    await expectation;
    jest.useRealTimers();
  });

  it('points at the TLS certificate on https, at the network on http', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    await expect(request(session, { path: '/x' })).rejects.toThrow(/certificat TLS/);
    await expect(request(session, { path: '/x' })).rejects.toMatchObject({
      detail: 'https://portainer.lan/api/x\nNetwork request failed',
    });
    await expect(
      request({ ...session, baseUrl: 'http://portainer.lan' }, { path: '/x' }),
    ).rejects.toThrow("Impossible de joindre l'instance Portainer. Vérifiez l'URL et le réseau.");
  });
});

describe('requestText and requestAnonymous', () => {
  it('returns raw text', async () => {
    fetchMock.mockResolvedValue(fakeResponse(200, 'log line'));
    await expect(requestText(session, { path: '/logs' })).resolves.toBe('log line');
  });

  it('does not authenticate anonymous requests', async () => {
    fetchMock.mockResolvedValue(fakeResponse(200, '{"Version":"2.27"}'));
    await expect(requestAnonymous('https://portainer.lan', { path: '/status' })).resolves.toEqual({
      Version: '2.27',
    });
    expect(lastCall().headers['X-API-Key']).toBeUndefined();
  });
});
