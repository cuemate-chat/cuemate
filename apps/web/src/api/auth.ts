import { message } from 'antd';
import type {
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
  UpdateUserRequest,
  User,
} from '../types';
import { http, storage } from './http';

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
