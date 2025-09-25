/**
 * AI对话数据持久化服务
 */

interface ConversationData {
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
  model_config?: Record<string, any>;
  message_count: number;
  token_used: number;
  status: 'active' | 'completed' | 'error';
  created_at: number;
  updated_at: number;
}

interface MessageData {
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

interface ConversationWithMessages {
  conversation: ConversationData;
  messages: MessageData[];
}

export class ConversationService {
  private baseURL = 'http://localhost:3001';
  private userData: any = null;
  private token: string | null = null;

  constructor() {
    this.initUserData();
  }

  private async initUserData() {
    try {
      const result = await (window as any).electronAPI.getUserData();
      if (result.success) {
        this.userData = result.userData;
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
   * 获取用户的最新活跃对话
   */
  async getLatestActiveConversation(): Promise<ConversationWithMessages | null> {
    await this.ensureAuth();

    try {
      const response = await fetch(`${this.baseURL}/ai/conversations?limit=1&status=active`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`获取对话列表失败: ${response.status}`);
      }

      const data = await response.json();
      if (data.items && data.items.length > 0) {
        const conversation = data.items[0];
        return await this.getConversationDetail(conversation.id);
      }

      return null;
    } catch (error) {
      console.error('获取最新对话失败:', error);
      return null;
    }
  }

  /**
   * 获取对话详情（包含所有消息）
   */
  async getConversationDetail(conversationId: number): Promise<ConversationWithMessages | null> {
    await this.ensureAuth();

    try {
      const response = await fetch(`${this.baseURL}/ai/conversations/${conversationId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`获取对话详情失败: ${response.status}`);
      }

      const data = await response.json();
      return data as ConversationWithMessages;
    } catch (error) {
      console.error('获取对话详情失败:', error);
      return null;
    }
  }

  /**
   * 创建新的对话会话
   */
  async createConversation(title: string): Promise<number | null> {
    await this.ensureAuth();

    if (!this.userData?.user?.model) {
      console.error('用户模型配置缺失');
      return null;
    }

    // 处理model_params数组转换为对象
    let modelConfig = {};
    if (this.userData.model_params && Array.isArray(this.userData.model_params)) {
      // 将model_params数组转换为key-value对象
      modelConfig = this.userData.model_params.reduce((config: any, param: any) => {
        if (param.param_key && param.value !== undefined) {
          config[param.param_key] = param.value;
        }
        return config;
      }, {});
    }

    const requestData = {
      title: title.length > 255 ? title.substring(0, 255) : title,
      model_id: this.userData.user.model.id,
      model_title: this.userData.user.model.name,
      model_provider: this.userData.user.model.provider || 'openai',
      model_name: this.userData.user.model.model_name || 'gpt-3.5-turbo',
      model_type: this.userData.user.model.type || 'llm',
      model_icon: this.userData.user.model.icon || '',
      model_version: this.userData.user.model.version || '',
      model_credentials: this.userData.user.model.credentials
        ? JSON.stringify(this.userData.user.model.credentials)
        : '',
      model_config: modelConfig,
    };

    try {
      const response = await fetch(`${this.baseURL}/ai/conversations`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`创建对话失败 ${response.status}:`, errorText);
        throw new Error(`创建对话失败: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.id;
    } catch (error) {
      console.error('创建对话失败:', error);
      return null;
    }
  }

  /**
   * 保存单条消息
   */
  async saveMessage(
    conversationId: number,
    messageType: 'user' | 'assistant',
    content: string,
    sequenceNumber: number,
    tokenCount: number = 0,
    responseTimeMs?: number,
    errorMessage?: string,
  ): Promise<boolean> {
    await this.ensureAuth();

    try {
      const response = await fetch(`${this.baseURL}/ai/messages`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          conversation_id: conversationId,
          message_type: messageType,
          content,
          content_format: 'text',
          sequence_number: sequenceNumber,
          token_count: tokenCount,
          response_time_ms: responseTimeMs,
          error_message: errorMessage,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`保存消息失败 ${response.status}:`, errorText);
        throw new Error(`保存消息失败: ${response.status} - ${errorText}`);
      }

      return true;
    } catch (error) {
      console.error('保存消息失败:', error);
      return false;
    }
  }

  /**
   * 批量保存消息
   */
  async batchSaveMessages(
    conversationId: number,
    messages: Array<{
      message_type: 'user' | 'assistant';
      content: string;
      sequence_number: number;
      token_count?: number;
      response_time_ms?: number;
      error_message?: string;
    }>,
  ): Promise<boolean> {
    await this.ensureAuth();

    try {
      const response = await fetch(
        `${this.baseURL}/ai/conversations/${conversationId}/messages/batch`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ messages }),
        },
      );

      if (!response.ok) {
        throw new Error(`批量保存消息失败: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('批量保存消息失败:', error);
      return false;
    }
  }

  /**
   * 更新对话状态
   */
  async updateConversationStatus(
    conversationId: number,
    status: 'active' | 'completed' | 'error',
    tokenUsed?: number,
  ): Promise<boolean> {
    await this.ensureAuth();

    try {
      const updateData: any = { status };
      if (tokenUsed !== undefined) {
        updateData.token_used = tokenUsed;
      }

      const response = await fetch(`${this.baseURL}/ai/conversations/${conversationId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error(`更新对话状态失败: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('更新对话状态失败:', error);
      return false;
    }
  }
}

export const conversationService = new ConversationService();
