import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import { BaseEmbeddingProvider, EmbeddingRequest, EmbeddingResponse } from './base.js';

export class VllmEmbeddingProvider extends BaseEmbeddingProvider {
  private client: OpenAI | null = null;

  constructor(cfg: Record<string, any>) {
    super('vllm', {
      baseUrl: cfg.base_url,
      apiKey: cfg.api_key || 'dummy', // vLLM 可能不需要真实的 API Key
      // 传递其他动态字段
      ...Object.fromEntries(
        Object.entries(cfg).filter(([key]) => !['base_url', 'api_key'].includes(key)),
      ),
    });

    if (this.config.baseUrl) {
      this.client = new OpenAI({
        baseURL: this.config.baseUrl,
        apiKey: this.config.apiKey,
      });
    }
  }

  isAvailable(): boolean {
    return !!this.client;
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    if (!this.client) {
      throw new Error('vLLM client not initialized');
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
      logger.error({ err: error as any }, 'vLLM embedding failed');
      throw error;
    }
  }
}
