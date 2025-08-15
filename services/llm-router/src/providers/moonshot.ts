import axios from 'axios';
import { logger } from '../utils/logger.js';
import { BaseLLMProvider, CompletionRequest, CompletionResponse } from './base.js';

export interface MoonshotConfig {
  apiKey?: string;
  baseUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  [key: string]: any; // 允许其他动态字段
}

export class MoonshotProvider extends BaseLLMProvider {
  constructor(cfg: MoonshotConfig) {
    super('moonshot', {
      apiKey: cfg.apiKey,
      baseUrl: cfg.baseUrl || 'https://api.moonshot.cn/v1',
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
  }

  isAvailable(): boolean {
    return !!this.config.apiKey;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    if (!this.config.apiKey) {
      throw new Error('Moonshot API key not configured');
    }

    const startTime = Date.now();

    try {
      const response = await axios.post(
        `${this.config.baseUrl}/chat/completions`,
        {
          model: this.config.model,
          messages: request.messages,
          temperature: request.temperature || this.config.temperature,
          max_tokens: request.maxTokens || this.config.maxTokens,
          stream: false,
        },
        {
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const latency = Date.now() - startTime;
      const completion = response.data;

      return {
        content: completion.choices[0]?.message?.content || '',
        usage: completion.usage
          ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            }
          : undefined,
        model: completion.model,
        provider: 'moonshot',
        latency,
      };
    } catch (error) {
      logger.error('Moonshot completion failed:', error);
      throw error;
    }
  }

  async *stream(request: CompletionRequest): AsyncGenerator<string> {
    if (!this.config.apiKey) {
      throw new Error('Moonshot API key not configured');
    }

    try {
      const response = await axios.post(
        `${this.config.baseUrl}/chat/completions`,
        {
          model: this.config.model,
          messages: request.messages,
          temperature: request.temperature || this.config.temperature,
          max_tokens: request.maxTokens || this.config.maxTokens,
          stream: true,
        },
        {
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          responseType: 'stream',
        },
      );

      const stream = response.data;
      let buffer = '';

      for await (const chunk of stream) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }
            try {
              const json = JSON.parse(data);
              const content = json.choices[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      logger.error('Moonshot stream failed:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.config.apiKey) {
      return false;
    }

    try {
      await axios.get(`${this.config.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        timeout: 5000,
      });
      return true;
    } catch (error) {
      logger.error('Moonshot health check failed:', error);
      return false;
    }
  }
}
