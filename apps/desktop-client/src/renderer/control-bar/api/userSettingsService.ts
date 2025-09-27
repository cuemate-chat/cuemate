/**
 * 用户设置服务
 * 处理用户设置的读取和更新
 */

export interface UserSettings {
  name?: string;
  email?: string;
  theme?: string;
  locale?: string;
  timezone?: string;
  selected_model_id?: string;
  floating_window_visible?: number;
  floating_window_height?: number;
  version?: string;
}

export interface UserInfo {
  id: string;
  email?: string;
  name?: string;
  created_at: number;
  theme?: string;
  locale?: string;
  timezone?: string;
  selected_model_id?: string;
  is_logged_in?: number;
  floating_window_visible?: number;
  floating_window_height?: number;
  version?: string;
}

export class UserSettingsService {
  private baseURL = 'http://localhost:3001';
  private token: string | null = null;

  constructor() {
    this.initAuth();
  }

  private async initAuth() {
    try {
      // 支持多种 API 接口
      const api = (window as any).electronAPI || (window as any).electronInterviewerAPI;
      const result = await api?.getUserData?.();
      if (result?.success && result.userData?.token) {
        this.token = result.userData.token;
      }
    } catch (error) {
      console.error('初始化用户认证失败:', error);
    }
  }

  private async ensureAuth() {
    if (!this.token) {
      await this.initAuth();
    }
    if (!this.token) {
      throw new Error('用户未登录或token获取失败');
    }
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
    };
  }

  /**
   * 更新用户设置
   */
  async updateSettings(settings: UserSettings): Promise<boolean> {
    await this.ensureAuth();

    try {
      const response = await fetch(`${this.baseURL}/auth/update-setting`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`更新用户设置失败 ${response.status}:`, errorText);
        throw new Error(`更新用户设置失败: ${response.status} - ${errorText}`);
      }

      return true;
    } catch (error) {
      console.error('更新用户设置失败:', error);
      return false;
    }
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<UserInfo | null> {
    await this.ensureAuth();

    try {
      const response = await fetch(`${this.baseURL}/auth/me`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`获取用户信息失败: ${response.status}`);
      }

      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return null;
    }
  }
}

export const userSettingsService = new UserSettingsService();