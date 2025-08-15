import { OpenAICompatibleProvider } from './openai-compatible.js';

export interface VllmConfig {
  baseUrl: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  [key: string]: any; // 允许其他动态字段
}

export class VllmProvider extends OpenAICompatibleProvider {
  constructor(cfg: VllmConfig) {
    super({
      id: 'vllm',
      baseUrl: cfg.baseUrl,
      model: cfg.model,
      temperature: cfg.temperature ?? 0.7,
      maxTokens: cfg.maxTokens ?? 2000,
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
      const client = new (await import('openai')).default({
        baseURL: this.config.baseUrl,
        apiKey: 'dummy', // vLLM 通常不需要 API key
      });
      try {
        await client.models.list();
        return true;
      } catch {}
      try {
        await client.chat.completions.create({
          model: this.config.model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
          temperature: 0,
        });
        return true;
      } catch (e) {
        return false;
      }
    } catch {
      return false;
    }
  }
}
