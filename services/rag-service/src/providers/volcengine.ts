import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import { BaseEmbeddingProvider, EmbeddingRequest, EmbeddingResponse } from './base.js';

export class VolcEngineEmbeddingProvider extends BaseEmbeddingProvider {
  private client: OpenAI | null = null;

  constructor(cfg: Record<string, any>) {
    super('volcengine', {
      apiKey: cfg.api_key,
      baseUrl: cfg.base_url,
      // 传递其他动态字段
      ...Object.fromEntries(
        Object.entries(cfg).filter(([key]) => !['api_key', 'base_url'].includes(key)),
      ),
    });

    if (this.config.apiKey && this.config.baseUrl) {
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
      throw new Error('VolcEngine client not initialized');
    }

    try {
      const res = await this.client.embeddings.create({
        model: request.model || this.config.model || 'text-embedding-v1',
        input: request.texts,
      });

      return {
        embeddings: res.data.map((d) => d.embedding as number[]),
        model: res.model,
        provider: this.name,
      };
    } catch (error) {
      logger.error({ err: error as any }, 'VolcEngine embedding failed');
      throw error;
    }
  }
}
