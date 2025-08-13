import OpenAI from 'openai';
import { Config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export class EmbeddingService {
  private openai?: OpenAI;
  constructor(private readonly config: Config['embeddings']) {
    if (config.provider === 'openai' && config.openaiApiKey) {
      this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    }
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (this.config.provider === 'openai' && this.openai) {
      const res = await this.openai.embeddings.create({
        model: this.config.openaiModel,
        input: texts,
      });
      return res.data.map((d) => d.embedding as number[]);
    }
    logger.warn('Using zero embeddings for private provider');
    return texts.map(() => []);
  }
}
