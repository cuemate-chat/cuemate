import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import { BaseLLMProvider, CompletionRequest, CompletionResponse } from './base.js';

export interface OpenAIConfig {
  apiKey?: string;
  baseUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  [key: string]: any; // 允许其他动态字段
}

export class OpenAIProvider extends BaseLLMProvider {
  private client: OpenAI | null = null;

  constructor(cfg: OpenAIConfig) {
    super('openai', {
      apiKey: cfg.apiKey,
      baseUrl: cfg.baseUrl,
      model: cfg.model,
      temperature: cfg.temperature ?? 0.7,
      maxTokens: cfg.maxTokens ?? 2000,
      // 传递其他动态字段（除了已明确指定的）
      ...Object.fromEntries(
        Object.entries(cfg).filter(
          ([key]) => !['apiKey', 'baseUrl', 'model', 'temperature', 'maxTokens'].includes(key),
        ),
      ),
    });

    if (this.config.apiKey) {
      this.client = new OpenAI({
        apiKey: this.config.apiKey,
        // 只有当 baseUrl 存在且不是默认值时才传递
        ...(this.config.baseUrl &&
          this.config.baseUrl !== 'https://api.openai.com/v1' && { baseURL: this.config.baseUrl }),
      });
    }
  }

  isAvailable(): boolean {
    return !!this.client;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    const startTime = Date.now();

    try {
      const completion = await this.client.chat.completions.create({
        model: this.config.model || 'gpt-4-turbo-preview',
        messages: request.messages,
        temperature: request.temperature || this.config.temperature,
        max_tokens: request.maxTokens || this.config.maxTokens,
        stream: false,
      });

      const response = completion.choices[0];
      const latency = Date.now() - startTime;

      return {
        content: response.message?.content || '',
        usage: completion.usage
          ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            }
          : undefined,
        model: completion.model,
        provider: 'openai',
        latency,
      };
    } catch (error) {
      logger.error('OpenAI completion failed:', error);
      throw error;
    }
  }

  async *stream(request: CompletionRequest): AsyncGenerator<string> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const stream = await this.client.chat.completions.create({
        model: this.config.model || 'gpt-4-turbo-preview',
        messages: request.messages,
        temperature: request.temperature || this.config.temperature,
        max_tokens: request.maxTokens || this.config.maxTokens,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      logger.error('OpenAI stream failed:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      // 先尝试列出模型（快速检查API连接性）
      try {
        await this.client.models.list();
      } catch {}
      
      // 然后实际测试指定模型是否可用 - 发送一个简单的测试请求
      await this.client.chat.completions.create({
        model: this.config.model,
        messages: [{ role: 'user', content: 'ping' }],
        temperature: 0,
        max_tokens: 1,
      });
      return true;
    } catch (error) {
      logger.error(`OpenAI health check failed for model ${this.config.model}:`, error);
      // 抛出异常而不是返回false，这样路由可以捕获具体的错误信息
      throw error;
    }
  }
}
