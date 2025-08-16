import { logger } from '../utils/logger.js';
import { BaseEmbeddingProvider, EmbeddingRequest, EmbeddingResponse } from './base.js';

export interface MockEmbeddingConfig {
  dimensions?: number;
  [key: string]: any; // 允许其他动态字段
}

export class MockEmbeddingProvider extends BaseEmbeddingProvider {
  private dimensions: number;

  constructor(cfg: MockEmbeddingConfig) {
    super('mock', {
      dimensions: cfg.dimensions || 1536,
      // 传递其他动态字段
      ...Object.fromEntries(Object.entries(cfg).filter(([key]) => !['dimensions'].includes(key))),
    });

    this.dimensions = this.config.dimensions || 1536;
  }

  isAvailable(): boolean {
    return true; // Mock 总是可用的
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    logger.info('Using mock embeddings for testing');

    const embeddings = request.texts.map(() => {
      // 生成随机但一致的嵌入向量
      const embedding = new Array(this.dimensions);
      for (let i = 0; i < this.dimensions; i++) {
        embedding[i] = Math.random() * 2 - 1; // -1 到 1 之间的随机数
      }
      return embedding;
    });

    return {
      embeddings,
      model: 'mock-embedding',
      provider: this.name,
    };
  }
}
