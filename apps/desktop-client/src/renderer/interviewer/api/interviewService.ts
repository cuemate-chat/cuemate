/**
 * 面试管理服务
 * 处理面试相关的API调用
 */

export type InterviewStatus =
  | 'idle'
  | 'mock-interview-recording'
  | 'mock-interview-paused'
  | 'mock-interview-completed'
  | 'mock-interview-playing'
  | 'interview-training-recording'
  | 'interview-training-paused'
  | 'interview-training-completed'
  | 'interview-training-playing';

export interface InterviewData {
  jobId: string;
  jobTitle?: string;
  jobContent?: string;
  questionCount?: number;
  resumesId?: string;
  resumesTitle?: string;
  resumesContent?: string;
  interviewType?: 'training' | 'mock';
  status?: InterviewStatus;
  message?: string;
  locale?: string;
  timezone?: string;
  theme?: string;
  selectedModelId?: string;
}

export interface CreateInterviewResponse {
  id: string;
}

export interface UpdateInterviewData {
  jobTitle?: string;
  jobContent?: string;
  questionCount?: number;
  resumesId?: string;
  resumesTitle?: string;
  resumesContent?: string;
  duration?: number;
  interviewType?: 'training' | 'mock';
  status?: InterviewStatus;
  message?: string;
}

export class InterviewService {
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
      console.error('初始化面试服务认证失败:', error);
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
   * 创建面试
   */
  async createInterview(data: InterviewData): Promise<CreateInterviewResponse> {
    await this.ensureAuth();

    try {
      const response = await fetch(`${this.baseURL}/interviews`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`创建面试失败: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('创建面试失败:', error);
      throw error;
    }
  }

  /**
   * 更新面试信息
   */
  async updateInterview(interviewId: string, data: UpdateInterviewData): Promise<void> {
    await this.ensureAuth();

    try {
      const response = await fetch(`${this.baseURL}/interviews/${interviewId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`更新面试失败: ${response.status}`);
      }
    } catch (error) {
      console.error('更新面试失败:', error);
      throw error;
    }
  }

  /**
   * 结束面试
   */
  async endInterview(interviewId: string): Promise<void> {
    await this.ensureAuth();

    try {
      const response = await fetch(`${this.baseURL}/interviews/${interviewId}/end`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`结束面试失败: ${response.status}`);
      }
    } catch (error) {
      console.error('结束面试失败:', error);
      throw error;
    }
  }
}

export const interviewService = new InterviewService();