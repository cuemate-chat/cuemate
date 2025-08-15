import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import { OpenAICompatibleProvider } from './openai-compatible.js';

export interface OllamaConfig {
  baseUrl: string; // http://localhost:11434
  model: string; // llama3.1:8b 等
  temperature?: number;
  maxTokens?: number;
  num_predict?: number; // Ollama 特有的参数
  [key: string]: any; // 允许其他动态字段
}

export class OllamaProvider extends OpenAICompatibleProvider {
  constructor(cfg: OllamaConfig) {
    super({
      id: 'ollama',
      baseUrl: cfg.baseUrl,
      model: cfg.model,
      temperature: cfg.temperature ?? 0.3,
      maxTokens: cfg.maxTokens ?? 1024,
      // 传递其他动态字段（除了已明确指定的）
      ...Object.fromEntries(
        Object.entries(cfg).filter(
          ([key]) => !['baseUrl', 'model', 'temperature', 'maxTokens'].includes(key),
        ),
      ),
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      const client = new OpenAI({
        baseURL: (this as any).config.baseUrl,
        apiKey: (this as any).config.apiKey,
      });
      try {
        await client.models.list();
        return true;
      } catch {}
      try {
        await client.chat.completions.create({
          model: (this as any).config.model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
          temperature: 0,
        });
        return true;
      } catch (e) {
        logger.error('Ollama healthCheck failed', e as any);
        return false;
      }
    } catch {
      return false;
    }
  }
}
