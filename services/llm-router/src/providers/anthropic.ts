import { OpenAICompatibleConfig, OpenAICompatibleProvider } from './openai-compatible.js';

export interface AnthropicConfig extends Partial<OpenAICompatibleConfig> {
  apiKey: string;
  model: string; // claude-3.7 等（需兼容代理）
}

export class AnthropicProvider extends OpenAICompatibleProvider {
  constructor(cfg: AnthropicConfig) {
    super({
      id: 'anthropic',
      baseUrl: cfg.baseUrl || 'https://api.anthropic.com/v1',
      apiKey: cfg.apiKey,
      model: cfg.model,
      temperature: cfg.temperature ?? 0.7,
      maxTokens: cfg.maxTokens ?? 2000,
    });
  }
}
