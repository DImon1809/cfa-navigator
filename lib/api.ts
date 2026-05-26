// Base URLs are injected from Docker environment (.env → docker-compose.yml)
const GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? 'http://localhost:8080';

const OAUTH_BASE_URL =
  process.env.NEXT_PUBLIC_API_OAUTH_URL ?? 'http://localhost:8081';

/** Прямые ссылки для OAuth-редиректа в браузере */
export const oauthUrl = {
  vk: `${OAUTH_BASE_URL}/oauth2/authorization/vk`,
  yandex: `${OAUTH_BASE_URL}/oauth2/authorization/yandex`,
};

// ─── Request / Response types ────────────────────────────────────────────────

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
}

export interface UserResponse {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string | null;
  enabled: boolean;
  roles: string[];
  createdAt: string;
}

export interface AiFact {
  label: string;
  value: string;
}

export interface CfaItem {
  id: string;
  issuer_name: string;
  inn: string;
  platform: string;
  dfa_type: string;
  status: 'active' | 'inactive' | 'redeemed';
  is_visible: boolean;
  confidence: number;
  coupon_rate_type: 'fixed' | 'floating';
  coupon_rate_fixed: number | null;
  coupon_benchmark: string | null;
  issue_date: string;
  maturity_date: string;
  total_volume: number;
  min_lot_rub: number;
  ai_summary: string | null;
  ai_facts: AiFact[];
  published_at: string;
}

export interface ApiErrorPayload {
  message: string;
  status: number;
}

// ─── Error class ─────────────────────────────────────────────────────────────

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    credentials: 'include',           // отправляем HttpOnly cookies автоматически
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    ...init,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const payload = (await res.json()) as ApiErrorPayload;
      if (payload.message) message = payload.message;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(message, res.status);
  }

  // 204 No Content — logout и т.п.
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ─── API methods ──────────────────────────────────────────────────────────────

export const api = {
  auth: {
    register: (data: RegisterRequest) =>
      request<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    login: (data: LoginRequest) =>
      request<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    logout: () =>
      request<void>('/api/auth/logout', { method: 'POST' }),

    refresh: () =>
      request<AuthResponse>('/api/auth/refresh', { method: 'POST' }),

    me: () =>
      request<UserResponse>('/api/auth/me'),
  },

  cfa: {
    /** GET /api/cfa/active — активные выпуски (требует авторизации) */
    active: () => request<CfaItem[]>('/api/cfa/active'),
  },
};