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
  theme: 'system' as 'light' | 'dark' | 'system',
  locale: 'zh-CN',
  version: 'v0.1.0',
  timezone: 'Asia/Shanghai',
  selected_model_id: '',
};

// 将用户数据转换为表单数据
export function userToFormData(user: any) {
  return {
    id: user.id,
    name: user.name || '',
    email: user.email || '',
    created_at: user.created_at || 0,
    theme: (user.theme || 'system') as 'light' | 'dark' | 'system',
    locale: user.locale || 'zh-CN',
    version: 'v0.1.0',
    timezone: user.timezone || 'Asia/Shanghai',
    selected_model_id: user.selected_model_id || '',
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

  // 通知桌面应用登录状态已变化
  try {
    if ((window as any).electronAPI && (window as any).electronAPI.notifyLoginStatusChanged) {
      await (window as any).electronAPI.notifyLoginStatusChanged(true, response.user);
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
  await http.post('/auth/signout');
}
