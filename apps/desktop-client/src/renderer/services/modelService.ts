/**
 * 大模型管理服务
 * 处理大模型相关的API调用
 */

export interface Model {
  id: string;
  name: string;
  provider: string;
  type: string;
  scope: string;
  model_name: string;
  icon?: string;
  version?: string;
  created_by?: string;
  is_enabled: number;
  created_at: number;
  updated_at?: number;
  credentials?: string;
  status?: string;
}

export interface ModelOption {
  label: string;
  value: string;
}

export class ModelService {
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
      console.error('初始化模型服务认证失败:', error);
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
   * 获取大模型列表
   */
  async getModels(params?: {
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<{ list: Model[]; total: number }> {
    await this.ensureAuth();

    try {
      const queryParams = new URLSearchParams();
      if (params?.type) queryParams.set('type', params.type);
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());

      const url = `${this.baseURL}/models${queryParams.toString() ? `?${queryParams}` : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`获取模型列表失败: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取模型列表失败:', error);
      return { list: [], total: 0 };
    }
  }

  /**
   * 获取模型选项列表（用于下拉框）
   */
  async getModelOptions(type: string = 'llm'): Promise<ModelOption[]> {
    try {
      const result = await this.getModels({ type });
      return (result.list || []).map((model: Model) => ({
        label: `${model.name} (${model.model_name})`,
        value: model.id,
      }));
    } catch (error) {
      console.error('获取模型选项失败:', error);
      return [];
    }
  }

  /**
   * 获取单个模型详情
   */
  async getModel(id: string): Promise<Model | null> {
    await this.ensureAuth();

    try {
      const response = await fetch(`${this.baseURL}/models/${id}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`获取模型详情失败: ${response.status}`);
      }

      const data = await response.json();
      return data.model;
    } catch (error) {
      console.error('获取模型详情失败:', error);
      return null;
    }
  }
}

export const modelService = new ModelService();