import { WEB_API_BASE } from '../config';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const REMEMBER_KEY = 'remember_account';
const REMEMBER_PWD_KEY = 'remember_password';
const REMEMBER_ENABLED_KEY = 'remember_enabled';

export const storage = {
  getToken: (): string | null => localStorage.getItem(TOKEN_KEY),
  setToken: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),
  setUser: (u: any) => localStorage.setItem(USER_KEY, JSON.stringify(u ?? null)),
  getUser: (): any | null => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  clearUser: () => localStorage.removeItem(USER_KEY),
  setRemember: (acc: string) => localStorage.setItem(REMEMBER_KEY, acc),
  getRemember: (): string | null => localStorage.getItem(REMEMBER_KEY),
  clearRemember: () => localStorage.removeItem(REMEMBER_KEY),
  setRememberPassword: (pwd: string) => localStorage.setItem(REMEMBER_PWD_KEY, pwd),
  getRememberPassword: (): string | null => localStorage.getItem(REMEMBER_PWD_KEY),
  clearRememberPassword: () => localStorage.removeItem(REMEMBER_PWD_KEY),
  setRememberEnabled: (on: boolean) => localStorage.setItem(REMEMBER_ENABLED_KEY, on ? '1' : '0'),
  getRememberEnabled: (): string | null => localStorage.getItem(REMEMBER_ENABLED_KEY),
  clearRememberEnabled: () => localStorage.removeItem(REMEMBER_ENABLED_KEY),
  clearRememberAll: () => {
    localStorage.removeItem(REMEMBER_KEY);
    localStorage.removeItem(REMEMBER_PWD_KEY);
    localStorage.removeItem(REMEMBER_ENABLED_KEY);
  },
};

export async function request(path: string, init: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as any),
  };
  const token = storage.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${WEB_API_BASE}${path}`, { ...init, headers });
  const data = await res.json().catch(() => undefined);
  if (!res.ok) throw new Error((data as any)?.error || '请求失败');
  return data;
}

export const http = {
  get: (p: string) => request(p, { method: 'GET' }),
  post: (p: string, body?: any) => request(p, { method: 'POST', body: JSON.stringify(body ?? {}) }),
};
