import type { Session } from './types';

/**
 * Cause the client could narrow down, so screens can offer the matching help
 * rather than parsing the message.
 */
export type PortainerErrorReason = 'certificate';

export class PortainerError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly detail?: string,
    readonly reason?: PortainerErrorReason,
  ) {
    super(message);
    this.name = 'PortainerError';
  }
}

/** Strips the trailing `/` and any `/api` suffix the user typed. */
export function normalizeBaseUrl(raw: string): string {
  let url = raw.trim();
  if (!url) throw new PortainerError('The instance URL is required.');
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  url = url.replace(/\/+$/, '');
  url = url.replace(/\/api$/i, '');
  return url;
}

function authHeaders(session: Session): Record<string, string> {
  return session.mode === 'apiKey'
    ? { 'X-API-Key': session.token }
    : { Authorization: `Bearer ${session.token}` };
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Path relative to `/api`, e.g. `/endpoints`. */
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Non-2xx codes to treat as success (see `runContainerAction`). */
  accept?: number[];
}

function buildUrl(baseUrl: string, path: string, query?: RequestOptions['query']): string {
  const url = `${baseUrl}/api${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return url;
  const params = Object.entries(query)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return params.length ? `${url}?${params.join('&')}` : url;
}

const DEFAULT_TIMEOUT_MS = 15_000;

type UnauthorizedListener = (token: string) => void;

let unauthorizedListener: UnauthorizedListener | null = null;

/**
 * Reports a 401 on an authenticated request, with the rejected token.
 * Detected here rather than in React Query: some mutations (stack actions)
 * catch their own errors and would never let them bubble up.
 */
export function setUnauthorizedListener(listener: UnauthorizedListener): () => void {
  unauthorizedListener = listener;
  return () => {
    if (unauthorizedListener === listener) unauthorizedListener = null;
  };
}

async function rawRequest(
  session: Pick<Session, 'baseUrl'> & Partial<Pick<Session, 'mode' | 'token'>>,
  opts: RequestOptions,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  if (opts.signal) opts.signal.addEventListener('abort', () => controller.abort(), { once: true });

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (session.token && session.mode) Object.assign(headers, authHeaders(session as Session));
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  const url = buildUrl(session.baseUrl, opts.path, opts.query);

  try {
    const response = await fetch(url, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: controller.signal,
    });
    if (!response.ok && !opts.accept?.includes(response.status)) {
      if (response.status === 401 && session.token) unauthorizedListener?.(session.token);
      throw await toError(response);
    }
    return response;
  } catch (error) {
    if (error instanceof PortainerError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new PortainerError('The Portainer instance did not respond in time.', undefined, url);
    }
    throw new PortainerError(
      unreachableMessage(url),
      undefined,
      describeCause(url, error),
      // Only a suspicion: the platforms report a refused connection the same
      // way. Offering the certificate help costs nothing if it's the network.
      url.startsWith('https://') ? 'certificate' : undefined,
    );
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * iOS and Android return the same "Network request failed" for a refused
 * connection and for a TLS rejection. Over HTTPS, a self-signed certificate is
 * by far the most frequent cause: naming it saves chasing the network instead.
 */
function unreachableMessage(url: string): string {
  if (url.startsWith('https://')) {
    return (
      'Connection refused. If the instance responds in a browser, the cause is ' +
      'almost always its TLS certificate: the system rejects a self-signed ' +
      'certificate, and the app has no way to accept it.'
    );
  }
  return 'Cannot reach the Portainer instance. Check the URL and the network.';
}

function describeCause(url: string, error: unknown): string {
  const cause = error instanceof Error ? error.message : String(error);
  return `${url}\n${cause}`;
}

async function toError(response: Response): Promise<PortainerError> {
  const body = await response.text().catch(() => '');
  let detail = body;
  try {
    const parsed = JSON.parse(body) as { message?: string; details?: string };
    detail = parsed.message ?? parsed.details ?? body;
  } catch {
    // non-JSON body: keep the raw text
  }
  const messages: Record<number, string> = {
    401: 'Authentication refused: invalid or expired token.',
    403: 'Access denied: this account has no rights on this resource.',
    404: 'Resource not found on this instance.',
    409: 'Conflict: the resource is already in that state.',
  };
  return new PortainerError(
    messages[response.status] ?? `Portainer error (HTTP ${response.status}).`,
    response.status,
    detail.slice(0, 500),
  );
}

/** Authenticated JSON request. */
export async function request<T>(session: Session, opts: RequestOptions): Promise<T> {
  const response = await rawRequest(session, opts);
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Authenticated request whose response is plain text (Docker logs). */
export async function requestText(session: Session, opts: RequestOptions): Promise<string> {
  const response = await rawRequest(session, opts);
  return response.text();
}

/** Unauthenticated request, to test a URL before storing credentials. */
export async function requestAnonymous<T>(baseUrl: string, opts: RequestOptions): Promise<T> {
  const response = await rawRequest({ baseUrl }, opts);
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
