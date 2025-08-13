import { OpenAICompatibleConfig, OpenAICompatibleProvider } from './openai-compatible.js';

export interface GeminiConfig extends Partial<OpenAICompatibleConfig> {
  apiKey?: string;
  baseUrl?: string;
  model: string;
}

export class GeminiProvider extends OpenAICompatibleProvider {
  constructor(cfg: GeminiConfig) {
    super({
      id: 'gemini',
      baseUrl: cfg.baseUrl || process.env.GEMINI_BASE_URL,
      apiKey: cfg.apiKey || process.env.GEMINI_API_KEY,
      model: cfg.model,
      temperature: cfg.temperature ?? 0.7,
      maxTokens: cfg.maxTokens ?? 2000,
    });
  }
}
