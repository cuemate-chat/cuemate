import { CONTAINER_FASTEMBED_DIR } from '@cuemate/config';
import { EmbeddingModel, FlagEmbedding } from 'fastembed';
import { Config } from '../config/index.js';
import { createModuleLogger } from '../utils/logger.js';

const log = createModuleLogger('EmbeddingService');

export class EmbeddingService {
  private fastEmbedModel: FlagEmbedding | null = null;
  private useFastEmbed: boolean = true;

  constructor(_config: Config['embeddings']) {
    this.initializeFastEmbed();
  }

  /**
   * 初始化 FastEmbed 模型（异步，失败时自动降级到 Hash 算法）
   */
  private async initializeFastEmbed(): Promise<void> {
    try {
      log.info('initializeFastEmbed', 'Initializing FastEmbed model (fast-bge-small-zh-v1.5)...');
      this.fastEmbedModel = await FlagEmbedding.init({
        model: EmbeddingModel.BGESmallZH,
        cacheDir: CONTAINER_FASTEMBED_DIR,
      });
      this.useFastEmbed = true;
      log.info('initializeFastEmbed', 'FastEmbed model initialized successfully, using semantic vector embedding');
    } catch (error) {
      log.warn('initializeFastEmbed', 'FastEmbed model initialization failed, falling back to Hash algorithm');
      this.useFastEmbed = false;
      this.fastEmbedModel = null;
    }
  }

  /**
   * 生成文本向量嵌入
   * 优先使用 FastEmbed（语义向量），失败时自动降级到 Hash 算法
   */
  async embed(texts: string[]): Promise<number[][]> {
    // 尝试使用 FastEmbed
    if (this.useFastEmbed && this.fastEmbedModel) {
      try {
        // fastembed 的 embed 返回 AsyncGenerator<number[][], void>
        // 每次 yield 一批向量，需要收集所有批次
        const embeddingsGenerator = this.fastEmbedModel.embed(texts);
        const allEmbeddings: number[][] = [];

        for await (const batch of embeddingsGenerator) {
          // batch 可能是 Float32Array[]，需要转换为 number[][]
          const normalizedBatch = batch.map((vec: any) =>
            Array.isArray(vec) ? vec : Array.from(vec),
          );
          allEmbeddings.push(...normalizedBatch);
        }

        log.info('embed', `Generated embeddings for ${allEmbeddings.length} texts using FastEmbed`);
        return allEmbeddings;
      } catch (error) {
        log.warn('embed', 'FastEmbed embedding generation failed, falling back to Hash algorithm');
        // Mark as unavailable, use Hash algorithm for subsequent calls
        this.useFastEmbed = false;
        this.fastEmbedModel = null;
      }
    }

    // Fall back to Hash algorithm
    log.info('embed', `Generated embeddings for ${texts.length} texts using Hash algorithm`);
    return this.embedWithHash(texts);
  }

  /**
   * Hash 算法实现（兜底方案）
   * 基于字符哈希生成 512 维向量（匹配 FastEmbed BGE-small-zh 模型维度）
   */
  private embedWithHash(texts: string[]): number[][] {
    return texts.map((text) => {
      const words = text.toLowerCase().split(/[\s,，.。!！?？:：;；\-_]+/);
      const vector = new Array(512).fill(0);

      words.forEach((word) => {
        if (!word) return;

        let hash = 0;
        for (let i = 0; i < word.length; i++) {
          hash = (hash << 5) - hash + word.charCodeAt(i);
          hash = hash & hash;
        }
        hash = Math.abs(hash);

        for (let i = 0; i < 8; i++) {
          const pos = (hash + i * 31) % 512;
          const value = ((hash >> (i * 4)) & 0xf) / 0xf;
          vector[pos] = (vector[pos] + value) / 2;
        }

        for (let i = 0; i < word.length; i++) {
          const code = word.charCodeAt(i);
          const pos = code % 512;
          vector[pos] = (vector[pos] + code / 65535) / 2;
        }
      });

      const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      return vector.map((val) => (magnitude === 0 ? 0 : val / magnitude));
    });
  }

  async setModelConfig(_modelConfig: any): Promise<void> {}

  /**
   * 返回当前是否使用 FastEmbed 模型
   */
  isUsingFastEmbed(): boolean {
    return this.useFastEmbed;
  }
}
