/**
 * 大模型管理服务
 * 处理大模型相关的 API 调用
 */

import { createLogger } from '../../../utils/rendererLogger.js';

const log = createLogger('ModelService');

export interface Model {
  id: string;
  name: string;
  provider: string;
  type: string;
  scope: string;
  modelName: string;
  icon?: string;
  version?: string;
  createdBy?: string;
  isEnabled: number;
  createdAt: number;
  updatedAt?: number;
  credentials?: string;
  status?: string;
}

export interface ModelOption {
  label: string;
  value: string;
}

export interface ModelParam {
  id: string;
  modelId: string;
  label: string;
  paramKey: string;
  uiType: string;
  value: string | number;
  defaultValue: string | number;
  required?: number;
  extra?: string;
}

export class ModelService {
  private baseURL = 'http://localhost:3001';

  private async getToken(): Promise<string> {
    const api = (window as any).electronAPI || (window as any).electronInterviewerAPI;
    const result = await api?.getUserData?.();
    if (result?.success && result.userData?.token) {
      return result.userData.token;
    }
    throw new Error('用户未登录或 token 获取失败');
  }

  private async getHeaders() {
    const token = await this.getToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
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
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.set('type', params.type);
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());

    const url = `${this.baseURL}/models${queryParams.toString() ? `?${queryParams}` : ''}`;

    try {
      const headers = await this.getHeaders();
      await log.http.request('getModels', url, 'GET', params);

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        await log.http.error('getModels', url, new Error(`HTTP ${response.status}`), params, errorText);
        throw new Error(`获取模型列表失败: ${response.status}`);
      }

      const data = await response.json();
      await log.http.response('getModels', url, response.status, data);
      return data;
    } catch (error) {
      await log.http.error('getModels', url, error, params);
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
        label: `${model.name} (${model.modelName})`,
        value: model.id,
      }));
    } catch (error) {
      await log.error('getModelOptions', '获取模型选项失败', { type }, error);
      return [];
    }
  }

  /**
   * 获取单个模型详情
   */
  async getModel(id: string): Promise<Model | null> {
    const url = `${this.baseURL}/models/${id}`;

    try {
      const headers = await this.getHeaders();
      await log.http.request('getModel', url, 'GET', { id });

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        await log.http.error('getModel', url, new Error(`HTTP ${response.status}`), { id }, errorText);
        throw new Error(`获取模型详情失败: ${response.status}`);
      }

      const data = await response.json();
      await log.http.response('getModel', url, response.status, data);
      return data.model;
    } catch (error) {
      await log.http.error('getModel', url, error, { id });
      return null;
    }
  }

  /**
   * 获取模型参数
   */
  async getModelParams(id: string): Promise<ModelParam[]> {
    const url = `${this.baseURL}/models/${id}`;

    try {
      const headers = await this.getHeaders();
      await log.http.request('getModelParams', url, 'GET', { id });

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        await log.http.error('getModelParams', url, new Error(`HTTP ${response.status}`), { id }, errorText);
        throw new Error(`获取模型参数失败: ${response.status}`);
      }

      const data = await response.json();
      await log.http.response('getModelParams', url, response.status, data);
      return data.params || [];
    } catch (error) {
      await log.http.error('getModelParams', url, error, { id });
      return [];
    }
  }
}

export const modelService = new ModelService();