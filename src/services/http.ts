import type { ApiErrorDetail, ApiErrorPayload, TokenResponse } from '@/types/api';
import { API_CONFIG } from './config';

/**
 * Standard error raised by all Folio360 API calls (both live and mock).
 */
export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ApiErrorDetail[];
  readonly requestId?: string;

  constructor(
    status: number,
    code: string,
    message: string,
    details: ApiErrorDetail[] = [],
    requestId?: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

/**
 * In-memory access token storage ONLY.
 * Refresh tokens are never stored in browser storage (httpOnly cookie on web).
 */
let accessTokenMemory: string | null = null;

export const tokenStore = {
  getAccessToken(): string | null {
    return accessTokenMemory;
  },
  setAccessToken(token: string | null): void {
    accessTokenMemory = token;
  },
  clear(): void {
    accessTokenMemory = null;
  },
};

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${encodeURIComponent(name)}=`;
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return null;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  skipAuth?: boolean;
  skipRefreshRetry?: boolean;
  signal?: AbortSignal;
}

export type MockHandler = (
  method: string,
  path: string,
  options: RequestOptions,
) => Promise<unknown>;

let registeredMockHandler: MockHandler | null = null;

export function registerMockHandler(handler: MockHandler): void {
  registeredMockHandler = handler;
}

let inFlightRefresh: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (inFlightRefresh) return inFlightRefresh;

  inFlightRefresh = (async () => {
    try {
      const csrf = readCookie('f360_csrf');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (csrf) {
        headers['X-CSRF-Token'] = csrf;
      }

      const data = await rawRequest<TokenResponse>('/auth/refresh', {
        method: 'POST',
        headers,
        skipAuth: true,
        skipRefreshRetry: true,
      });

      tokenStore.setAccessToken(data.access_token);
      return data.access_token;
    } catch {
      tokenStore.clear();
      return null;
    } finally {
      inFlightRefresh = null;
    }
  })();

  return inFlightRefresh;
}

function buildUrl(
  path: string,
  query?: Record<string, string | number | boolean | undefined | null>,
): string {
  const cleanBase = API_CONFIG.apiBaseUrl.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${cleanBase}${cleanPath}`;

  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, val] of Object.entries(query)) {
    if (val !== undefined && val !== null && val !== '') {
      params.set(key, String(val));
    }
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function parseErrorResponse(res: Response): Promise<ApiClientError> {
  try {
    const json = (await res.json()) as Partial<ApiErrorPayload>;
    if (json && json.error) {
      return new ApiClientError(
        res.status,
        json.error.code || 'INTERNAL_ERROR',
        json.error.message || res.statusText || 'Request failed.',
        json.error.details ?? [],
        json.error.request_id,
      );
    }
  } catch {
    // Response wasn't JSON
  }
  return new ApiClientError(
    res.status,
    res.status === 401 ? 'UNAUTHENTICATED' : 'INTERNAL_ERROR',
    res.statusText || 'Unexpected server error.',
  );
}

async function rawRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';

  if (API_CONFIG.useMocks) {
    if (!registeredMockHandler) {
      throw new ApiClientError(
        500,
        'INTERNAL_ERROR',
        'Mock API mode is enabled, but no mock handler is registered.',
      );
    }
    return (await registeredMockHandler(method, path, options)) as T;
  }

  const headers: Record<string, string> = {
    ...(options.headers ?? {}),
  };

  const token = tokenStore.getAccessToken();
  if (!options.skipAuth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Cookie-mode CSRF header for refresh and logout
  if (path === '/auth/refresh' || path === '/auth/logout') {
    const csrf = readCookie('f360_csrf');
    if (csrf && !headers['X-CSRF-Token']) {
      headers['X-CSRF-Token'] = csrf;
    }
  }

  let bodyInit: BodyInit | undefined;
  if (options.body instanceof FormData) {
    bodyInit = options.body;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
    bodyInit = JSON.stringify(options.body);
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body: bodyInit,
      credentials: 'include',
      signal: options.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    throw new ApiClientError(0, 'NETWORK_ERROR', 'Unable to reach Folio360 API.');
  }

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export const httpClient = {
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    try {
      return await rawRequest<T>(path, options);
    } catch (err) {
      if (
        err instanceof ApiClientError &&
        err.status === 401 &&
        err.code === 'TOKEN_EXPIRED' &&
        !options.skipRefreshRetry &&
        !options.skipAuth
      ) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          return rawRequest<T>(path, { ...options, skipRefreshRetry: true });
        }
      }
      throw err;
    }
  },

  get<T>(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  },

  post<T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'POST', body });
  },

  patch<T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PATCH', body });
  },

  delete<T = void>(path: string, options: Omit<RequestOptions, 'method'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  },

  tryRestoreSession(): Promise<string | null> {
    return refreshAccessToken();
  },
};
