import { OpenAICompatibleConfig, OpenAICompatibleProvider } from './openai-compatible.js';

export interface KimiConfig extends Partial<OpenAICompatibleConfig> {
  apiKey?: string;
  baseUrl?: string;
  model: string;
}

export class KimiProvider extends OpenAICompatibleProvider {
  constructor(cfg: KimiConfig) {
    super({
      id: 'kimi',
      baseUrl: cfg.baseUrl || 'https://api.moonshot.cn/v1',
      apiKey: cfg.apiKey || process.env.KIMI_API_KEY,
      model: cfg.model || process.env.KIMI_MODEL || 'moonshot-v1-32k',
      temperature: cfg.temperature ?? 0.7,
      maxTokens: cfg.maxTokens ?? 2000,
    });
  }
}
