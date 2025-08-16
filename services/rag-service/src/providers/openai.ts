import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import { BaseEmbeddingProvider, EmbeddingRequest, EmbeddingResponse } from './base.js';

export interface OpenAIEmbeddingConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  [key: string]: any; // 允许其他动态字段
}

export class OpenAIEmbeddingProvider extends BaseEmbeddingProvider {
  private client: OpenAI | null = null;

  constructor(cfg: OpenAIEmbeddingConfig) {
    super('openai', {
      apiKey: cfg.apiKey,
      baseUrl: cfg.baseUrl,
      model: cfg.model || 'text-embedding-3-large',
      // 传递其他动态字段（除了已明确指定的）
      ...Object.fromEntries(
        Object.entries(cfg).filter(([key]) => !['apiKey', 'baseUrl', 'model'].includes(key)),
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

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const res = await this.client.embeddings.create({
        model: request.model || this.config.model || 'text-embedding-3-large',
        input: request.texts,
      });

      return {
        embeddings: res.data.map((d) => d.embedding as number[]),
        model: res.model,
        provider: this.name,
      };
    } catch (error) {
      logger.error({ err: error as any }, 'OpenAI embedding failed');
      throw error;
    }
  }
}
