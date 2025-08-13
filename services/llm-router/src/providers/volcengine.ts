import { OpenAICompatibleConfig, OpenAICompatibleProvider } from './openai-compatible.js';

export interface VolcConfig extends Partial<OpenAICompatibleConfig> {
  apiKey?: string;
  baseUrl?: string;
  model: string;
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
    });
  }
}
