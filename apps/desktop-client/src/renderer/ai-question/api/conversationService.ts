/**
 * AI 对话数据持久化服务
 */

import { logger } from '../../../utils/rendererLogger.js';
import { estimateTokens } from '../../utils/ai/calculateTokens';

interface ConversationData {
  id: number;
  title: string;
  modelId: string;
  modelTitle: string;
  modelProvider: string;
  modelName: string;
  modelType: string;
  modelIcon: string;
  modelVersion: string;
  modelCredentials: string;
  modelConfig?: Record<string, any>;
  messageCount: number;
  tokenUsed: number;
  status: 'active' | 'completed' | 'error';
  createdAt: number;
  updatedAt: number;
}

interface MessageData {
  id: number;
  conversationId: number;
  messageType: 'user' | 'assistant' | 'system';
  content: string;
  contentFormat: 'text' | 'markdown' | 'json';
  sequenceNumber: number;
  tokenCount: number;
  responseTimeMs?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: number;
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
      logger.error(`初始化用户数据失败: ${error}`);
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
      logger.error(`获取最新对话失败: ${error}`);
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
      logger.error(`获取对话详情失败: ${error}`);
      return null;
    }
  }

  /**
   * 创建新的对话会话
   */
  async createConversation(title: string): Promise<number | null> {
    await this.ensureAuth();

    if (!this.userData?.user?.model) {
      logger.error('用户模型配置缺失');
      return null;
    }

    // 处理 modelParams 数组转换为对象
    let modelConfig = {};
    if (this.userData.modelParams && Array.isArray(this.userData.modelParams)) {
      // 将 modelParams 数组转换为 key-value 对象
      modelConfig = this.userData.modelParams.reduce((config: any, param: any) => {
        if (param.paramKey && param.value !== undefined) {
          config[param.paramKey] = param.value;
        }
        return config;
      }, {});
    }

    const requestData = {
      title: title.length > 255 ? title.substring(0, 255) : title,
      modelId: this.userData.user.model.id,
      modelTitle: this.userData.user.model.name,
      modelProvider: this.userData.user.model.provider || 'openai',
      modelName: this.userData.user.model.modelName || 'gpt-3.5-turbo',
      modelType: this.userData.user.model.type || 'llm',
      modelIcon: this.userData.user.model.icon || '',
      modelVersion: this.userData.user.model.version || '',
      modelCredentials: this.userData.user.model.credentials
        ? JSON.stringify(this.userData.user.model.credentials)
        : '',
      modelConfig: modelConfig,
    };

    try {
      const response = await fetch(`${this.baseURL}/ai/conversations`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`创建对话失败 ${response.status}: ${errorText}`);
        throw new Error(`创建对话失败: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.id;
    } catch (error) {
      logger.error(`创建对话失败: ${error}`);
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
      // 如果 tokenCount 为 0，使用本地估算
      let finalTokenCount = tokenCount;
      let tokenSource = 'llm'; // 默认是 LLM 返回的

      if (finalTokenCount === 0 && content) {
        finalTokenCount = estimateTokens(content);
        tokenSource = 'estimated'; // 标记为本地估算
      }

      const requestBody = {
        conversationId: conversationId,
        messageType: messageType,
        content,
        contentFormat: 'text',
        sequenceNumber: sequenceNumber,
        tokenCount: finalTokenCount,
        tokenSource: tokenSource,
        responseTimeMs: responseTimeMs,
        errorMessage: errorMessage,
      };

      const response = await fetch(`${this.baseURL}/ai/messages`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`保存消息失败: ${response.status} - ${errorText}`);
      }

      await response.json();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 批量保存消息
   */
  async batchSaveMessages(
    conversationId: number,
    messages: Array<{
      messageType: 'user' | 'assistant';
      content: string;
      sequenceNumber: number;
      tokenCount?: number;
      responseTimeMs?: number;
      errorMessage?: string;
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
      logger.error(`批量保存消息失败: ${error}`);
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
        updateData.tokenUsed = tokenUsed;
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
      logger.error(`更新对话状态失败: ${error}`);
      return false;
    }
  }
}

export const conversationService = new ConversationService();
