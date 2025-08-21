import { WEB_API_BASE } from '../config';

const TOKEN_KEY = 'auth_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function login(email: string, password: string): Promise<void> {
  const res = await fetch(`${WEB_API_BASE}/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account: email, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || '登录失败');
  }
  const data = await res.json();
  if (!data?.token) throw new Error('登录失败：缺少凭证');
  setToken(data.token);
}

export async function register(name: string, email: string, password: string): Promise<void> {
  const res = await fetch(`${WEB_API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, account: email, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || '注册失败');
  }
  const data = await res.json();
  if (!data?.token) throw new Error('注册失败：缺少凭证');
  setToken(data.token);
}

export async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(init.headers as any),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${WEB_API_BASE}${path}`, { ...init, headers });
}
