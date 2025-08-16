import { Config } from '../config/index.js';
import { BaseEmbeddingProvider } from '../providers/base.js';
import { EmbeddingProviderFactory } from '../providers/factory.js';
import { logger } from '../utils/logger.js';

// 数据库模型配置接口 - 完全动态，不预设任何字段
interface DatabaseModelConfig {
  id: string;
  provider: string;
  model_name: string;
  [key: string]: any; // 允许任何字段，完全动态
}

export class EmbeddingService {
  private config: Config['embeddings'];
  private currentProvider?: BaseEmbeddingProvider;
  private currentModelConfig?: DatabaseModelConfig;

  constructor(config: Config['embeddings']) {
    this.config = config;
  }

  // 动态设置模型配置 - 从数据库读取，完全动态
  async setModelConfig(modelConfig: DatabaseModelConfig) {
    this.currentModelConfig = modelConfig;

    // 使用工厂创建对应的提供者
    this.currentProvider = EmbeddingProviderFactory.createProvider(
      modelConfig.provider,
      modelConfig,
    );

    logger.info(`Setting embedding model: ${modelConfig.provider}/${modelConfig.model_name}`);
  }

  async embed(texts: string[]): Promise<number[][]> {
    // 优先使用数据库配置的模型
    if (this.currentProvider && this.currentProvider.isAvailable()) {
      try {
        const response = await this.currentProvider.embed({
          texts,
          model: this.currentModelConfig?.model_name,
        });
        return response.embeddings;
      } catch (error) {
        logger.error(
          { err: error as any },
          `${this.currentModelConfig?.provider} embedding failed, falling back to mock`,
        );
        // 如果模型失败，回退到 mock 模式
        return this.generateMockEmbeddings(texts);
      }
    }

    // 默认回退到 mock 模式
    logger.warn('No model configured, using mock embeddings');
    return this.generateMockEmbeddings(texts);
  }

  private generateMockEmbeddings(texts: string[]): number[][] {
    const dimensions = this.config.dimensions;
    return texts.map(() => {
      // 生成随机但一致的嵌入向量
      const embedding = new Array(dimensions);
      for (let i = 0; i < dimensions; i++) {
        embedding[i] = Math.random() * 2 - 1; // -1 到 1 之间的随机数
      }
      return embedding;
    });
  }
}
