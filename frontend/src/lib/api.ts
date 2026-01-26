import type { Command, LearnedCommand, Page, Visibility } from './types';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
const API_TOKEN = import.meta.env.VITE_API_TOKEN ?? '';

let tokenCache: string | null = null;

function loadToken(): string | null {
  if (tokenCache) return tokenCache;
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('cmvault_token');
    if (stored) {
      tokenCache = stored;
      return stored;
    }
  }
  return null;
}

export function setAuthToken(token: string | null) {
  tokenCache = token;
  if (typeof localStorage !== 'undefined') {
    if (token) {
      localStorage.setItem('cmvault_token', token);
    } else {
      localStorage.removeItem('cmvault_token');
    }
  }
}

export function getAuthToken(): string | null {
  return loadToken();
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const activeToken = getAuthToken() ?? API_TOKEN;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
    ...init.headers
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      message = data.error ?? message;
    } catch {
      message = await res.text();
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  // Some endpoints return 201 with an empty body; guard against JSON parse errors.
  const contentLength = res.headers.get('content-length');
  if (contentLength === '0' || contentLength === null) {
    try {
      const text = await res.text();
      if (!text.trim()) {
        return undefined as T;
      }
      return JSON.parse(text) as T;
    } catch {
      return undefined as T;
    }
  }

  return res.json() as Promise<T>;
}

export async function fetchCommands(options?: { search?: string; limit?: number; offset?: number }): Promise<Page<Command>> {
  const params = new URLSearchParams();
  if (options?.search) params.set('q', options.search);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  const query = params.toString();
  const suffix = query ? `?${query}` : '';
  return request<Page<Command>>(`/api/commands${suffix}`);
}

export interface CreateCommandInput {
  title?: string;
  text: string;
  description?: string;
  platform: string;
  visibility: Visibility;
  tags: string[];
}

export async function createCommand(payload: CreateCommandInput): Promise<Command> {
  return request<Command>('/api/commands', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function deleteCommand(id: string): Promise<void> {
  await request<void>(`/api/commands/${id}`, { method: 'DELETE' });
}

export async function fetchLearned(options?: { limit?: number; offset?: number }): Promise<Page<LearnedCommand>> {
  const qs = new URLSearchParams();
  if (options?.limit) qs.set('limit', String(options.limit));
  if (options?.offset) qs.set('offset', String(options.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return request<Page<LearnedCommand>>(`/api/learned${suffix}`);
}

export interface PromotePayload {
  title?: string;
  description?: string;
  platform: string;
  visibility: Visibility;
  tags: string[];
}

export async function promoteLearned(id: string, payload: PromotePayload): Promise<void> {
  await request(`/api/learned/${id}/promote`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export interface DeviceCodeResponse {
  code: string;
  expires_at: string;
}

export async function createDeviceCode(): Promise<DeviceCodeResponse> {
  return request<DeviceCodeResponse>('/api/device-codes', { method: 'POST' });
}

export interface AuthResponse {
  token: string;
  user_id: string;
}

export async function register(payload: { email: string; password: string; label?: string }): Promise<AuthResponse> {
  return request<AuthResponse>('/api/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function login(payload: { email: string; password: string; label?: string }): Promise<AuthResponse> {
  return request<AuthResponse>('/api/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
