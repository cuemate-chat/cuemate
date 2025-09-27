import { EventEmitter } from 'events';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

export interface StreamingRequest {
  messages: LLMMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface StreamingChunk {
  content: string;
  isComplete: boolean;
  metadata?: any;
}

export interface StreamingSession {
  id: string;
  messages: LLMMessage[];
  isActive: boolean;
  startTime: number;
  lastActivity: number;
}

export enum LLMManagerState {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  STREAMING = 'streaming',
  PROCESSING = 'processing',
  ERROR = 'error'
}

export class StreamingLLMManager extends EventEmitter {
  private llmRouterURL = 'http://localhost:3002';
  private currentState: LLMManagerState = LLMManagerState.IDLE;
  private activeSessions: Map<string, StreamingSession> = new Map();
  private abortController: AbortController | null = null;
  private sessionTimeout = 300000; // 5分钟会话超时
  private cleanupInterval: NodeJS.Timeout | null = null;
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor() {
    super();
    this.startSessionCleanup();
  }

  /**
   * 创建新的对话会话
   */
  createSession(sessionId?: string): string {
    const id = sessionId || this.generateSessionId();

    const session: StreamingSession = {
      id,
      messages: [],
      isActive: false,
      startTime: Date.now(),
      lastActivity: Date.now(),
    };

    this.activeSessions.set(id, session);
    this.emit('sessionCreated', session);

    console.log(`Created LLM session: ${id}`);
    return id;
  }

  /**
   * 获取会话
   */
  getSession(sessionId: string): StreamingSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * 发送流式请求
   */
  async sendStreamingRequest(
    sessionId: string,
    request: StreamingRequest,
    onChunk?: (chunk: StreamingChunk) => void,
    onComplete?: (fullResponse: string) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      const error = new Error(`Session not found: ${sessionId}`);
      onError?.(error);
      throw error;
    }

    // 更新会话状态
    session.isActive = true;
    session.lastActivity = Date.now();
    this.currentState = LLMManagerState.CONNECTING;
    this.emit('stateChanged', this.currentState);

    // 创建新的AbortController
    this.abortController = new AbortController();

    let retryCount = 0;
    let fullResponse = '';

    const attemptRequest = async (): Promise<void> => {
      try {
        this.currentState = LLMManagerState.STREAMING;
        this.emit('stateChanged', this.currentState);

        // 合并会话历史和新消息
        const allMessages = [...session.messages, ...request.messages];

        const requestBody = {
          messages: allMessages,
          model: request.model || 'gpt-4o',
          stream: true,
          max_tokens: request.maxTokens || 1000,
          temperature: request.temperature || 0.7,
        };

        console.log(`Sending streaming request for session ${sessionId}:`, {
          messageCount: allMessages.length,
          model: requestBody.model,
        });

        const response = await fetch(`${this.llmRouterURL}/chat/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: this.abortController?.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Failed to get response reader');
        }

        const decoder = new TextDecoder();
        fullResponse = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.trim() === '') continue;
              if (line.startsWith('data: ')) {
                const data = line.slice(6);

                if (data === '[DONE]') {
                  // 流式响应完成
                  this.handleStreamComplete(sessionId, fullResponse, request, onComplete);
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content || '';

                  if (content) {
                    fullResponse += content;
                    session.lastActivity = Date.now();

                    const streamingChunk: StreamingChunk = {
                      content,
                      isComplete: false,
                      metadata: {
                        sessionId,
                        totalLength: fullResponse.length,
                        timestamp: Date.now(),
                      }
                    };

                    onChunk?.(streamingChunk);
                    this.emit('chunkReceived', streamingChunk);
                  }
                } catch (parseError) {
                  console.warn('Failed to parse streaming chunk:', parseError);
                }
              }
            }
          }

          // 如果到这里说明流没有正常结束
          this.handleStreamComplete(sessionId, fullResponse, request, onComplete);

        } catch (streamError) {
          throw streamError;
        }

      } catch (error) {
        console.error(`LLM request error (attempt ${retryCount + 1}):`, error);

        // 检查是否是取消操作
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('LLM request was aborted');
          this.currentState = LLMManagerState.IDLE;
          session.isActive = false;
          this.emit('stateChanged', this.currentState);
          return;
        }

        // 重试逻辑
        if (retryCount < this.maxRetries) {
          retryCount++;
          console.log(`Retrying LLM request in ${this.retryDelay}ms (${retryCount}/${this.maxRetries})`);

          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
          this.retryDelay *= 2; // 指数退避

          return attemptRequest();
        }

        // 最终失败
        this.currentState = LLMManagerState.ERROR;
        session.isActive = false;
        this.emit('stateChanged', this.currentState);
        this.emit('error', error);

        onError?.(error as Error);
        throw error;
      }
    };

    await attemptRequest();
  }

  /**
   * 处理流式响应完成
   */
  private handleStreamComplete(
    sessionId: string,
    fullResponse: string,
    request: StreamingRequest,
    onComplete?: (fullResponse: string) => void
  ): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    // 添加消息到会话历史
    request.messages.forEach(msg => {
      session.messages.push({
        ...msg,
        timestamp: Date.now(),
      });
    });

    // 添加AI回复到历史
    session.messages.push({
      role: 'assistant',
      content: fullResponse,
      timestamp: Date.now(),
    });

    session.isActive = false;
    session.lastActivity = Date.now();

    this.currentState = LLMManagerState.IDLE;
    this.emit('stateChanged', this.currentState);

    const finalChunk: StreamingChunk = {
      content: fullResponse,
      isComplete: true,
      metadata: {
        sessionId,
        totalLength: fullResponse.length,
        messageCount: session.messages.length,
        timestamp: Date.now(),
      }
    };

    this.emit('streamComplete', finalChunk);
    onComplete?.(fullResponse);

    console.log(`Stream completed for session ${sessionId}, response length: ${fullResponse.length}`);
  }

  /**
   * 取消当前请求
   */
  cancelCurrentRequest(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      console.log('LLM request cancelled');
    }

    this.currentState = LLMManagerState.IDLE;
    this.emit('stateChanged', this.currentState);
  }

  /**
   * 清理会话
   */
  clearSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.isActive = false;
      this.activeSessions.delete(sessionId);
      this.emit('sessionCleared', sessionId);
      console.log(`Cleared session: ${sessionId}`);
    }
  }

  /**
   * 获取会话历史
   */
  getSessionHistory(sessionId: string): LLMMessage[] {
    const session = this.activeSessions.get(sessionId);
    return session ? [...session.messages] : [];
  }

  /**
   * 修剪会话历史（保留最近的N条消息）
   */
  trimSessionHistory(sessionId: string, maxMessages: number = 20): void {
    const session = this.activeSessions.get(sessionId);
    if (session && session.messages.length > maxMessages) {
      // 保留系统消息和最近的消息
      const systemMessages = session.messages.filter(msg => msg.role === 'system');
      const recentMessages = session.messages
        .filter(msg => msg.role !== 'system')
        .slice(-maxMessages + systemMessages.length);

      session.messages = [...systemMessages, ...recentMessages];
      this.emit('sessionTrimmed', sessionId, session.messages.length);

      console.log(`Trimmed session ${sessionId} to ${session.messages.length} messages`);
    }
  }

  /**
   * 获取当前状态
   */
  getState(): LLMManagerState {
    return this.currentState;
  }

  /**
   * 获取活跃会话列表
   */
  getActiveSessions(): StreamingSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `llm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 启动会话清理定时器
   */
  private startSessionCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const expiredSessions: string[] = [];

      for (const [sessionId, session] of this.activeSessions.entries()) {
        if (!session.isActive && (now - session.lastActivity) > this.sessionTimeout) {
          expiredSessions.push(sessionId);
        }
      }

      expiredSessions.forEach(sessionId => {
        this.clearSession(sessionId);
      });

      if (expiredSessions.length > 0) {
        console.log(`Cleaned up ${expiredSessions.length} expired LLM sessions`);
      }
    }, 60000); // 每分钟清理一次
  }

  /**
   * 获取状态描述
   */
  getStateDescription(): string {
    const descriptions: Record<LLMManagerState, string> = {
      [LLMManagerState.IDLE]: '空闲',
      [LLMManagerState.CONNECTING]: '连接中',
      [LLMManagerState.STREAMING]: '流式处理中',
      [LLMManagerState.PROCESSING]: '处理中',
      [LLMManagerState.ERROR]: '错误状态',
    };
    return descriptions[this.currentState] || this.currentState;
  }

  /**
   * 检查服务健康状态
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.llmRouterURL}/health`, {
        method: 'GET',
        timeout: 5000,
      } as any);

      return response.ok;
    } catch (error) {
      console.error('LLM Router health check failed:', error);
      return false;
    }
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    // 取消当前请求
    this.cancelCurrentRequest();

    // 清理所有会话
    for (const sessionId of this.activeSessions.keys()) {
      this.clearSession(sessionId);
    }

    // 清理定时器
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // 移除所有监听器
    this.removeAllListeners();

    console.log('StreamingLLMManager destroyed');
  }
}

export const streamingLLMManager = new StreamingLLMManager();