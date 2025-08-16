import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import { BaseEmbeddingProvider, EmbeddingRequest, EmbeddingResponse } from './base.js';

export class AzureOpenAIEmbeddingProvider extends BaseEmbeddingProvider {
  private client: OpenAI | null = null;

  constructor(cfg: Record<string, any>) {
    super('azure-openai', {
      apiKey: cfg.api_key,
      baseUrl: cfg.base_url,
      apiVersion: cfg.api_version || '2024-02-15-preview',
      // 传递其他动态字段
      ...Object.fromEntries(
        Object.entries(cfg).filter(
          ([key]) => !['api_key', 'base_url', 'api_version'].includes(key),
        ),
      ),
    });

    if (this.config.apiKey && this.config.baseUrl) {
      this.client = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseUrl,
        defaultQuery: { 'api-version': this.config.apiVersion },
      });
    }
  }

  isAvailable(): boolean {
    return !!this.client;
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    if (!this.client) {
      throw new Error('Azure OpenAI client not initialized');
    }

    try {
      const res = await this.client.embeddings.create({
        model: request.model || this.config.deployment_name || this.config.model,
        input: request.texts,
      });

      return {
        embeddings: res.data.map((d) => d.embedding as number[]),
        model: res.model,
        provider: this.name,
      };
    } catch (error) {
      logger.error({ err: error as any }, 'Azure OpenAI embedding failed');
      throw error;
    }
  }
}
