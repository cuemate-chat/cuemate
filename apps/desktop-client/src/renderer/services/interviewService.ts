interface InterviewData {
  jobId: string;
  jobTitle?: string;
  jobContent?: string;
  questionCount?: number;
  resumesId?: string;
  resumesTitle?: string;
  resumesContent?: string;
  interviewType?: 'mock' | 'training';
}

interface CreateInterviewResponse {
  id: string;
}

interface UpdateInterviewData {
  jobTitle?: string;
  jobContent?: string;
  questionCount?: number;
  resumesId?: string;
  resumesTitle?: string;
  resumesContent?: string;
  duration?: number;
  interviewType?: 'mock' | 'training';
}

class InterviewService {
  private baseURL = 'http://localhost:3001';

  private async getAuthHeaders(): Promise<Headers> {
    const headers = new Headers({
      'Content-Type': 'application/json',
    });

    try {
      // 从 localStorage 获取 token
      const token = localStorage.getItem('authToken');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    } catch (error) {
      console.warn('获取认证token失败:', error);
    }

    return headers;
  }

  async createInterview(data: InterviewData): Promise<CreateInterviewResponse> {
    const headers = await this.getAuthHeaders();

    try {
      const response = await fetch(`${this.baseURL}/interviews`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '创建面试失败');
      }

      return await response.json();
    } catch (error) {
      console.error('创建面试失败:', error);
      throw error;
    }
  }

  async updateInterview(id: string, data: UpdateInterviewData): Promise<{ success: boolean }> {
    const headers = await this.getAuthHeaders();

    try {
      const response = await fetch(`${this.baseURL}/interviews/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '更新面试失败');
      }

      return await response.json();
    } catch (error) {
      console.error('更新面试失败:', error);
      throw error;
    }
  }

  async endInterview(id: string): Promise<{ success: boolean }> {
    const headers = await this.getAuthHeaders();

    try {
      const response = await fetch(`${this.baseURL}/interviews/${id}/end`, {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '结束面试失败');
      }

      return await response.json();
    } catch (error) {
      console.error('结束面试失败:', error);
      throw error;
    }
  }
}

export const interviewService = new InterviewService();
export type { InterviewData, CreateInterviewResponse, UpdateInterviewData };