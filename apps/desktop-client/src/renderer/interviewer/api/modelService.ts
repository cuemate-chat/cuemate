/**
 * 大模型管理服务
 * 处理大模型相关的 API 调用
 */

import { logger } from '../../../utils/rendererLogger.js';

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

export interface ModelParam {
  id: string;
  model_id: string;
  label: string;
  param_key: string;
  ui_type: string;
  value: string | number;
  default_value: string | number;
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
    try {
      const headers = await this.getHeaders();
      const queryParams = new URLSearchParams();
      if (params?.type) queryParams.set('type', params.type);
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());

      const url = `${this.baseURL}/models${queryParams.toString() ? `?${queryParams}` : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`获取模型列表失败: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      logger.error(`获取模型列表失败: ${error}`);
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
      logger.error(`获取模型选项失败: ${error}`);
      return [];
    }
  }

  /**
   * 获取单个模型详情
   */
  async getModel(id: string): Promise<Model | null> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseURL}/models/${id}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`获取模型详情失败: ${response.status}`);
      }

      const data = await response.json();
      return data.model;
    } catch (error) {
      logger.error(`获取模型详情失败: ${error}`);
      return null;
    }
  }

  /**
   * 获取模型参数
   */
  async getModelParams(id: string): Promise<ModelParam[]> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseURL}/models/${id}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`获取模型参数失败: ${response.status}`);
      }

      const data = await response.json();
      return data.params || [];
    } catch (error) {
      logger.error(`获取模型参数失败: ${error}`);
      return [];
    }
  }
}

export const modelService = new ModelService();