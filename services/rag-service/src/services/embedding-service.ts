import { Config } from '../config/index.js';

export class EmbeddingService {
  constructor(_config: Config['embeddings']) {
    // 不需要任何配置，因为我们使用ChromaDB的默认嵌入函数
  }

  async embed(texts: string[]): Promise<number[][]> {
    // 使用一个简单的嵌入函数，将文本转换为向量
    return texts.map((text) => {
      // 将文本转换为小写并分词
      const words = text.toLowerCase().split(/[\s,，.。!！?？:：;；\-_]+/);

      // 生成一个384维的向量（ChromaDB的默认维度）
      const vector = new Array(384).fill(0);

      // 对每个词，使用其字符的Unicode码点影响向量的多个维度
      words.forEach((word) => {
        if (!word) return;

        // 计算词的哈希值
        let hash = 0;
        for (let i = 0; i < word.length; i++) {
          hash = (hash << 5) - hash + word.charCodeAt(i);
          hash = hash & hash; // Convert to 32-bit integer
        }
        hash = Math.abs(hash);

        // 使用词的哈希值影响多个维度
        for (let i = 0; i < 8; i++) {
          const pos = (hash + i * 31) % 384;
          const value = ((hash >> (i * 4)) & 0xf) / 0xf; // 0-1之间的值
          vector[pos] = (vector[pos] + value) / 2;
        }

        // 对每个字符，使用其Unicode码点影响向量的某些维度
        for (let i = 0; i < word.length; i++) {
          const code = word.charCodeAt(i);
          const pos = code % 384;
          vector[pos] = (vector[pos] + code / 65535) / 2; // 65535是Unicode的最大值
        }
      });

      // 归一化向量
      const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      return vector.map((val) => (magnitude === 0 ? 0 : val / magnitude));
    });
  }

  async setModelConfig(_modelConfig: any): Promise<void> {
    // 不需要任何配置，因为我们使用简单的嵌入函数
  }
}
