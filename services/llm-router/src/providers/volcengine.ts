import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import { OpenAICompatibleProvider } from './openai-compatible.js';

export interface VolcConfig {
  apiKey?: string;
  baseUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  [key: string]: any; // 允许其他动态字段
}

export class VolcEngineProvider extends OpenAICompatibleProvider {
  constructor(cfg: VolcConfig) {
    super({
      id: 'volcengine',
      baseUrl: cfg.baseUrl || process.env.VOLC_BASE_URL,
      apiKey: cfg.apiKey || process.env.VOLC_API_KEY,
      model: cfg.model,
      temperature: cfg.temperature ?? 0.7,
      maxTokens: cfg.maxTokens ?? 2000,
      // 传递其他动态字段（除了已明确指定的）
      ...Object.fromEntries(
        Object.entries(cfg).filter(
          ([key]) => !['baseUrl', 'apiKey', 'model', 'temperature', 'maxTokens'].includes(key),
        ),
      ),
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      const client = new OpenAI({
        apiKey: (this as any).config.apiKey,
        baseURL: (this as any).config.baseUrl,
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
        logger.error('VolcEngine healthCheck failed', e as any);
        return false;
      }
    } catch {
      return false;
    }
  }
}
