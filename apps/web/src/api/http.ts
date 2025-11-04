import { message as globalMessage } from '../components/Message';
import { WEB_API_BASE } from '../config';
import type { User } from '../types';

// 本地存储键名常量
const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USER: 'auth_user',
  LICENSE: 'cuemate_license',
  REMEMBER_ACCOUNT: 'remember_account',
  REMEMBER_PASSWORD: 'remember_password',
  REMEMBER_ENABLED: 'remember_enabled',
} as const;

/**
 * 本地存储工具类
 */
export const storage = {
  // Token 管理
  getToken: (): string | null => localStorage.getItem(STORAGE_KEYS.TOKEN),
  setToken: (token: string): void => localStorage.setItem(STORAGE_KEYS.TOKEN, token),
  clearToken: (): void => localStorage.removeItem(STORAGE_KEYS.TOKEN),

  // 用户信息管理
  setUser: (user: User | null): void => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user ?? null));
  },
  getUser: (): User | null => {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  clearUser: (): void => localStorage.removeItem(STORAGE_KEYS.USER),

  // 记住登录信息管理
  setRemember: (account: string): void => {
    localStorage.setItem(STORAGE_KEYS.REMEMBER_ACCOUNT, account);
  },
  getRemember: (): string | null => localStorage.getItem(STORAGE_KEYS.REMEMBER_ACCOUNT),
  clearRemember: (): void => localStorage.removeItem(STORAGE_KEYS.REMEMBER_ACCOUNT),

  setRememberPassword: (password: string): void => {
    localStorage.setItem(STORAGE_KEYS.REMEMBER_PASSWORD, password);
  },
  getRememberPassword: (): string | null => localStorage.getItem(STORAGE_KEYS.REMEMBER_PASSWORD),
  clearRememberPassword: (): void => localStorage.removeItem(STORAGE_KEYS.REMEMBER_PASSWORD),

  setRememberEnabled: (enabled: boolean): void => {
    localStorage.setItem(STORAGE_KEYS.REMEMBER_ENABLED, enabled ? '1' : '0');
  },
  getRememberEnabled: (): boolean => localStorage.getItem(STORAGE_KEYS.REMEMBER_ENABLED) === '1',
  clearRememberEnabled: (): void => localStorage.removeItem(STORAGE_KEYS.REMEMBER_ENABLED),

  // License 管理
  getLicense: (): any | null => {
    const stored = localStorage.getItem(STORAGE_KEYS.LICENSE);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        localStorage.removeItem(STORAGE_KEYS.LICENSE);
        return null;
      }
    }
    return null;
  },
  setLicense: (licenseInfo: any): void => {
    // 排除敏感字段
    const safeLicenseInfo = { ...(licenseInfo ?? {}) } as Record<string, unknown>;
    // 显式删除敏感字段，避免未使用变量的 Lint 告警
    delete (safeLicenseInfo as any).license_key;
    localStorage.setItem(STORAGE_KEYS.LICENSE, JSON.stringify(safeLicenseInfo));
  },
  clearLicense: (): void => localStorage.removeItem(STORAGE_KEYS.LICENSE),

  // 清除所有记住的信息
  clearRememberAll: (): void => {
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_ACCOUNT);
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_PASSWORD);
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_ENABLED);
  },
};

/**
 * HTTP 错误类
 */
class HttpError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message: string,
    public data?: any,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * 统一的 HTTP 请求函数
 */
export async function request<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };

  // 只有在没有自定义 Content-Type 且不是 FormData 时才设置默认的 JSON Content-Type
  if (!headers['Content-Type'] && !(init.body instanceof FormData) && init.body) {
    headers['Content-Type'] = 'application/json';
  }

  // 添加认证头
  const token = storage.getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${WEB_API_BASE}${path}`, {
      ...init,
      headers,
    });

    let data: any;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMessage = data?.error || data?.message || `请求失败 (${response.status})`;
      const error = new HttpError(response.status, response.statusText, errorMessage, data);

      // 处理认证错误
      if (response.status === 401) {
        storage.clearToken();
        storage.clearUser();

        // 登录页或登录接口不进行整页跳转，交由页面自行展示错误
        const isOnLoginPage =
          typeof window !== 'undefined' && window.location.pathname.startsWith('/login');
        const isSigninRequest = path.includes('/auth/signin');
        if (!isOnLoginPage && !isSigninRequest) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      // 全局错误提示
      globalMessage.error(errorMessage);
      throw error;
    }

    return data;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    // 网络错误等
    const networkError = new Error('网络异常，请稍后重试');
    globalMessage.error(networkError.message);
    throw networkError;
  }
}

/**
 * HTTP 客户端工具
 */
export const http = {
  get: <T = any>(path: string, params?: Record<string, any>): Promise<T> => {
    const url = params ? `${path}?${new URLSearchParams(params).toString()}` : path;
    return request<T>(url, { method: 'GET' });
  },

  post: <T = any>(path: string, body?: any): Promise<T> => {
    // 如果没有 body，不设置 Content-Type，让浏览器自动处理
    const headers: Record<string, string> = {};
    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    return request<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      headers,
    });
  },

  put: <T = any>(path: string, body?: any): Promise<T> => {
    const headers: Record<string, string> = {};
    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    return request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    });
  },

  patch: <T = any>(path: string, body?: any): Promise<T> => {
    const headers: Record<string, string> = {};
    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    return request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    });
  },

  delete: <T = any>(path: string): Promise<T> => {
    return request<T>(path, { method: 'DELETE' });
  },
};
