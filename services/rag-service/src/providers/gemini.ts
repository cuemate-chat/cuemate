import { logger } from '../utils/logger.js';
import { BaseEmbeddingProvider, EmbeddingRequest, EmbeddingResponse } from './base.js';

export class GeminiEmbeddingProvider extends BaseEmbeddingProvider {
  private apiKey?: string;
  private baseUrl: string;

  constructor(cfg: Record<string, any>) {
    super('gemini', {
      apiKey: cfg.api_key,
      baseUrl: cfg.base_url || 'https://generativelanguage.googleapis.com',
      // 传递其他动态字段
      ...Object.fromEntries(
        Object.entries(cfg).filter(([key]) => !['api_key', 'base_url'].includes(key)),
      ),
    });

    this.apiKey = this.config.apiKey;
    this.baseUrl = this.config.baseUrl;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not provided');
    }

    try {
      const embeddings = await Promise.all(
        request.texts.map(async (text) => {
          const response = await fetch(
            `${this.baseUrl}/v1beta/models/embedding-001:embedText?key=${this.apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text }),
            },
          );

          if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
          }

          const data = (await response.json()) as { embedding: { values: number[] } };
          return data.embedding.values;
        }),
      );

      return {
        embeddings,
        model: 'embedding-001',
        provider: this.name,
      };
    } catch (error) {
      logger.error({ err: error as any }, 'Gemini embedding failed');
      throw error;
    }
  }
}
