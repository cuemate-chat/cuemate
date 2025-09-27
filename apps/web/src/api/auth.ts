import { message } from 'antd';
import type {
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
  UpdateUserRequest,
  User,
} from '../types';
import { http, storage } from './http';

// 默认用户表单数据
export const defaultUserForm = {
  id: '',
  name: '',
  email: '',
  created_at: 0,
  theme: 'system',
  locale: 'zh-CN',
  timezone: 'Asia/Shanghai',
  selected_model_id: '',
  is_logged_in: 0,
  floating_window_visible: 1,
  floating_window_height: 75,
};

// 将用户数据转换为表单数据
export function userToFormData(user: any) {
  return {
    id: user.id,
    name: user.name || '',
    email: user.email || '',
    created_at: user.created_at || 0,
    theme: user.theme || 'system',
    locale: user.locale || 'zh-CN',
    timezone: user.timezone || 'Asia/Shanghai',
    selected_model_id: user.selected_model_id || '',
    is_logged_in: user.is_logged_in ?? 0,
    floating_window_visible: user.floating_window_visible ?? 1,
    floating_window_height: user.floating_window_height ?? 75,
  };
}

export async function signin(account: string, password: string): Promise<LoginResponse> {
  const request: LoginRequest = { account, password };
  const response = await http.post<LoginResponse>('/auth/signin', request);

  storage.setToken(response.token);
  storage.setUser(response.user);

  // 登录成功后获取 license 信息
  try {
    const licenseResponse = await http.get<{ license: any }>('/license/info');
    if (licenseResponse.license) {
      storage.setLicense(licenseResponse.license);
    }
  } catch (error) {
    message.error('获取 license 信息失败:' + error);
  }

  // 通过 WebSocket 通知桌面应用登录状态已变化
  try {
    // 检查是否在 Electron 环境中
    if (typeof window !== 'undefined' && (window as any).process?.versions?.electron) {
      // 使用 WebSocket 通信
      const { getWebSocketBridge } = await import('../utils/websocketBridge');
      const bridge = getWebSocketBridge();
      bridge.notifyLoginSuccess(response.user);
    }
  } catch (error) {
    console.warn('通知桌面应用登录状态变化失败:', error);
  }

  return response;
}

export async function fetchMe(): Promise<User> {
  const response = await http.get<{ user: User }>('/auth/me');

  storage.setUser(response.user);
  return response.user;
}

export async function updateMe(payload: UpdateUserRequest): Promise<User> {
  const response = await http.post<{ user: User }>('/auth/update-setting', payload);

  storage.setUser(response.user);
  return response.user;
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  const request: ChangePasswordRequest = { oldPassword, newPassword };
  await http.post('/auth/change-password', request);
}

export async function signout(): Promise<void> {
  // 保证无论接口是否成功，都执行本地清理与通知
  let apiError: unknown = null;
  try {
    await http.post('/auth/signout');
  } catch (err) {
    // 记录但不抛出，继续执行本地清理与通知
    apiError = err;
  }

  // 清除本地状态（无论接口是否成功）
  storage.clearToken();
  storage.clearUser();

  // 通过 WebSocket 通知桌面应用登录状态已变化（登出）
  try {
    // 检查是否在 Electron 环境中
    if (typeof window !== 'undefined' && (window as any).process?.versions?.electron) {
      // 使用 WebSocket 通信
      const { getWebSocketBridge } = await import('../utils/websocketBridge');
      const bridge = getWebSocketBridge();
      bridge.notifyLogout();
    }
  } catch (error) {
    // 静默处理通知失败
    console.warn('通知桌面应用登录状态变化失败:', error);
  }

  // 如果需要，保留原始错误给上层使用（但通常上层无需感知）
  if (apiError) {
    // 不抛出以保证 UI 正常流转（上层一般会提示"已退出登录"并跳转）
  }
}
