import { Config } from '../config/index.js';

export class EmbeddingService {
  constructor(_config: Config['embeddings']) {}

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((text) => {
      const words = text.toLowerCase().split(/[\s,，.。!！?？:：;；\-_]+/);
      const vector = new Array(384).fill(0);

      words.forEach((word) => {
        if (!word) return;

        let hash = 0;
        for (let i = 0; i < word.length; i++) {
          hash = (hash << 5) - hash + word.charCodeAt(i);
          hash = hash & hash;
        }
        hash = Math.abs(hash);

        for (let i = 0; i < 8; i++) {
          const pos = (hash + i * 31) % 384;
          const value = ((hash >> (i * 4)) & 0xf) / 0xf;
          vector[pos] = (vector[pos] + value) / 2;
        }

        for (let i = 0; i < word.length; i++) {
          const code = word.charCodeAt(i);
          const pos = code % 384;
          vector[pos] = (vector[pos] + code / 65535) / 2;
        }
      });

      const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      return vector.map((val) => (magnitude === 0 ? 0 : val / magnitude));
    });
  }

  async setModelConfig(_modelConfig: any): Promise<void> {}
}
