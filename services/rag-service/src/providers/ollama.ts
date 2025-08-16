import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import { BaseEmbeddingProvider, EmbeddingRequest, EmbeddingResponse } from './base.js';

export interface OllamaEmbeddingConfig {
  baseUrl: string; // http://localhost:11434
  model?: string; // llama3.1:8b 等
  [key: string]: any; // 允许其他动态字段
}

export class OllamaEmbeddingProvider extends BaseEmbeddingProvider {
  private client: OpenAI | null = null;

  constructor(cfg: OllamaEmbeddingConfig) {
    super('ollama', {
      baseUrl: cfg.baseUrl,
      model: cfg.model || 'llama2',
      // 传递其他动态字段（除了已明确指定的）
      ...Object.fromEntries(
        Object.entries(cfg).filter(([key]) => !['baseUrl', 'model'].includes(key)),
      ),
    });

    if (this.config.baseUrl) {
      this.client = new OpenAI({
        baseURL: this.config.baseUrl,
        apiKey: 'dummy', // Ollama 不需要真实的 API Key
      });
    }
  }

  isAvailable(): boolean {
    return !!this.client;
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    if (!this.client) {
      throw new Error('Ollama client not initialized');
    }

    try {
      const res = await this.client.embeddings.create({
        model: request.model || this.config.model || 'llama2',
        input: request.texts,
      });

      return {
        embeddings: res.data.map((d) => d.embedding as number[]),
        model: res.model,
        provider: this.name,
      };
    } catch (error) {
      logger.error({ err: error as any }, 'Ollama embedding failed');
      throw error;
    }
  }
}
