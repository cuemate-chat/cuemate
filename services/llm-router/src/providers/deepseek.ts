import { OpenAICompatibleConfig, OpenAICompatibleProvider } from './openai-compatible.js';

export interface DeepSeekConfig extends Partial<OpenAICompatibleConfig> {
  apiKey?: string;
  model: string;
}

export class DeepSeekProvider extends OpenAICompatibleProvider {
  constructor(cfg: DeepSeekConfig) {
    super({
      id: 'deepseek',
      baseUrl: cfg.baseUrl || 'https://api.deepseek.com/v1',
      apiKey: cfg.apiKey,
      model: cfg.model,
      temperature: cfg.temperature ?? 0.3,
      maxTokens: cfg.maxTokens ?? 2000,
    });
  }
}
