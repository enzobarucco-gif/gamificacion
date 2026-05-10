import type { ApiError } from '@pgd/shared';

const BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1';

export class PgdApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'PgdApiError';
  }
}

function getStore() {
  // Evitar import circular: acceder al store via singleton lazy
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../stores/auth.store').useAuthStore.getState() as {
    accessToken: string | null;
    refreshToken: string | null;
    setTokens: (a: string, r: string) => void;
    logout: () => void;
  };
}

async function request<T>(path: string, init?: RequestInit, retry = true): Promise<T> {
  const store = getStore();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (store.accessToken) headers['Authorization'] = `Bearer ${store.accessToken}`;
  Object.assign(headers, init?.headers ?? {});

  const res = await fetch(`${BASE_URL}/api/v1${path}`, { ...init, headers });

  // Refresh automático en 401
  if (res.status === 401 && retry && store.refreshToken) {
    const refreshRes = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: store.refreshToken }),
    });
    if (refreshRes.ok) {
      const { access_token, refresh_token } = (await refreshRes.json()) as { access_token: string; refresh_token: string };
      store.setTokens(access_token, refresh_token);
      return request<T>(path, init, false);
    }
    store.logout();
    throw new PgdApiError(401, 'TOKEN_EXPIRED', 'Sesión expirada, ingresá de nuevo');
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: { code: 'UNKNOWN', message: res.statusText } }))) as ApiError;
    throw new PgdApiError(res.status, body.error.code, body.error.message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string, init?: RequestInit) => request<T>(path, { method: 'GET', ...init }),
  post: <T>(path: string, body: unknown, init?: RequestInit) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body), ...init }),
  patch: <T>(path: string, body: unknown, init?: RequestInit) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body), ...init }),
  delete: <T>(path: string, init?: RequestInit) => request<T>(path, { method: 'DELETE', ...init }),
};
