import { OpenAICompatibleConfig, OpenAICompatibleProvider } from './openai-compatible.js';

export interface TencentConfig extends Partial<OpenAICompatibleConfig> {
  apiKey?: string;
  baseUrl?: string;
  model: string;
}

export class TencentProvider extends OpenAICompatibleProvider {
  constructor(cfg: TencentConfig) {
    super({
      id: 'tencent',
      baseUrl: cfg.baseUrl || process.env.TENCENT_BASE_URL,
      apiKey: cfg.apiKey || process.env.TENCENT_API_KEY,
      model: cfg.model,
      temperature: cfg.temperature ?? 0.7,
      maxTokens: cfg.maxTokens ?? 2000,
    });
  }
}
