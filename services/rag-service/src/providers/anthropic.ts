import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import { BaseEmbeddingProvider, EmbeddingRequest, EmbeddingResponse } from './base.js';

export interface AnthropicEmbeddingConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  [key: string]: any; // 允许其他动态字段
}

export class AnthropicEmbeddingProvider extends BaseEmbeddingProvider {
  private client: OpenAI | null = null;

  constructor(cfg: AnthropicEmbeddingConfig) {
    super('anthropic', {
      apiKey: cfg.apiKey,
      baseUrl: cfg.baseUrl || 'https://api.anthropic.com/v1',
      model: cfg.model || 'claude-3-sonnet-20240229',
      // 传递其他动态字段（除了已明确指定的）
      ...Object.fromEntries(
        Object.entries(cfg).filter(([key]) => !['apiKey', 'baseUrl', 'model'].includes(key)),
      ),
    });

    if (this.config.apiKey) {
      this.client = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseUrl,
      });
    }
  }

  isAvailable(): boolean {
    return !!this.client;
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    if (!this.client) {
      throw new Error('Anthropic client not initialized');
    }

    try {
      const res = await this.client.embeddings.create({
        model: request.model || this.config.model || 'claude-3-sonnet-20240229',
        input: request.texts,
      });

      return {
        embeddings: res.data.map((d) => d.embedding as number[]),
        model: res.model,
        provider: this.name,
      };
    } catch (error) {
      logger.error({ err: error as any }, 'Anthropic embedding failed');
      throw error;
    }
  }
}
