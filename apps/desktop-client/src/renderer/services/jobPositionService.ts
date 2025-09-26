/**
 * 岗位管理服务
 * 处理岗位相关的API调用
 */

export interface JobPosition {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: number;
  vector_status: number;
  resumeId?: string;
  resumeTitle?: string;
  resumeContent?: string;
  question_count?: number;
}

export class JobPositionService {
  private baseURL = 'http://localhost:3001';
  private token: string | null = null;

  constructor() {
    this.initAuth();
  }

  private async initAuth() {
    try {
      // 支持多种 API 接口（interviewer 窗口使用 electronInterviewerAPI）
      const api = (window as any).electronAPI || (window as any).electronInterviewerAPI;
      const result = await api?.getUserData?.();
      if (result?.success && result.userData?.token) {
        this.token = result.userData.token;
      }
    } catch (error) {
      console.error('初始化岗位服务认证失败:', error);
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
   * 获取岗位列表
   */
  async getJobPositions(): Promise<{ items: JobPosition[]; total: number }> {
    await this.ensureAuth();

    try {
      const url = `${this.baseURL}/jobs`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`获取岗位列表失败: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取岗位列表失败:', error);
      return { items: [], total: 0 };
    }
  }

  /**
   * 获取单个岗位详情
   */
  async getJobPosition(id: string): Promise<JobPosition | null> {
    await this.ensureAuth();

    try {
      const response = await fetch(`${this.baseURL}/jobs/${id}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`获取岗位详情失败: ${response.status}`);
      }

      const data = await response.json();
      return data.job;
    } catch (error) {
      console.error('获取岗位详情失败:', error);
      return null;
    }
  }
}

export const jobPositionService = new JobPositionService();