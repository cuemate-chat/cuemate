/**
 * AI 对话历史记录服务
 */

export interface ConversationHistoryItem {
  id: number;
  title: string;
  model_id: string;
  model_title: string;
  model_provider: string;
  model_name: string;
  model_type: string;
  model_icon: string;
  model_version: string;
  model_credentials: string;
  message_count: number;
  token_used: number;
  status: 'active' | 'completed' | 'error';
  created_at: number;
  updated_at: number;
}

export interface ConversationHistoryResponse {
  items: ConversationHistoryItem[];
  total: number;
}

export interface MessageDetail {
  id: number;
  conversation_id: number;
  message_type: 'user' | 'assistant' | 'system';
  content: string;
  content_format: 'text' | 'markdown' | 'json';
  sequence_number: number;
  token_count: number;
  response_time_ms?: number;
  error_message?: string;
  metadata?: Record<string, any>;
  created_at: number;
}

export interface ConversationDetailResponse {
  conversation: ConversationHistoryItem;
  messages: MessageDetail[];
}

export interface InterviewReview {
  id: string;
  interview_id: string;
  note_type: 'mock' | 'training';
  content: string;
  question_id?: string;
  question?: string;
  answer?: string;
  asked_question?: string;
  candidate_answer?: string;
  pros?: string;
  cons?: string;
  suggestions?: string;
  key_points?: string;
  assessment?: string;
  reference_answer?: string;
  other_id?: string;
  other_content?: string;
  created_at: number;
}

export class ConversationHistoryService {
  private baseURL = 'http://localhost:3001';
  private token: string | null = null;

  constructor() {
    this.initUserData();
  }

  private async initUserData() {
    try {
      const result = await (window as any).electronHistoryAPI.getUserData();
      if (result.success) {
        this.token = result.userData.token;
      }
    } catch (error) {
      console.error('初始化用户数据失败:', error);
    }
  }

  private async ensureAuth() {
    if (!this.token) {
      await this.initUserData();
    }
    if (!this.token) {
      throw new Error('用户未登录或 token 获取失败');
    }
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
    };
  }

  /**
   * 获取对话历史列表
   */
  async getConversationHistory(
    page: number = 1,
    limit: number = 5,
    status: string = 'all',
    searchKeyword?: string,
  ): Promise<ConversationHistoryResponse> {
    await this.ensureAuth();

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      // 只有当 status 不是'all'时才添加 status 参数
      if (status && status !== 'all') {
        params.append('status', status);
      }

      // 如果有搜索关键词，添加到参数中
      if (searchKeyword && searchKeyword.trim()) {
        params.append('search', searchKeyword.trim());
      }

      const response = await fetch(`${this.baseURL}/ai/conversations?${params}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`获取对话历史失败 ${response.status}:`, errorText);
        throw new Error(`获取对话历史失败: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      return {
        items: data.items || [],
        total: data.total || 0,
      };
    } catch (error) {
      console.error('获取对话历史失败:', error);
      throw error;
    }
  }

  /**
   * 获取对话详情（包含所有消息）
   */
  async getConversationDetail(conversationId: number): Promise<ConversationDetailResponse> {
    await this.ensureAuth();

    try {
      const response = await fetch(`${this.baseURL}/ai/conversations/${conversationId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`获取对话详情失败 ${response.status}:`, errorText);
        throw new Error(`获取对话详情失败: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      return data as ConversationDetailResponse;
    } catch (error) {
      console.error('获取对话详情失败:', error);
      throw error;
    }
  }

  /**
   * 删除对话
   */
  async deleteConversation(conversationId: number): Promise<boolean> {
    await this.ensureAuth();

    try {
      const response = await fetch(`${this.baseURL}/ai/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`删除对话失败 ${response.status}:`, errorText);
        throw new Error(`删除对话失败: ${response.status} - ${errorText}`);
      }

      return true;
    } catch (error) {
      console.error('删除对话失败:', error);
      return false;
    }
  }

  /**
   * 停止对话（将状态改为 completed）
   */
  async stopConversation(conversationId: number): Promise<boolean> {
    await this.ensureAuth();

    try {
      const response = await fetch(`${this.baseURL}/ai/conversations/${conversationId}/stop`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ status: 'completed' }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`停止对话失败 ${response.status}:`, errorText);
        throw new Error(`停止对话失败: ${response.status} - ${errorText}`);
      }

      return true;
    } catch (error) {
      console.error('停止对话失败:', error);
      return false;
    }
  }

  /**
   * 获取面试复盘记录
   */
  async getInterviewReviews(interviewId: string): Promise<InterviewReview[]> {
    await this.ensureAuth();

    try {
      const response = await fetch(`${this.baseURL}/interview-reviews?interview_id=${interviewId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`获取面试复盘记录失败 ${response.status}:`, errorText);
        throw new Error(`获取面试复盘记录失败: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('获取面试复盘记录失败:', error);
      throw error;
    }
  }

  /**
   * 格式化时间显示
   */
  formatTime(timestamp: number): string {
    const date = new Date(timestamp * 1000); // 假设 timestamp 是秒级时间戳

    // 显示完整的年月日时分秒
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }
}

export const conversationHistoryService = new ConversationHistoryService();
