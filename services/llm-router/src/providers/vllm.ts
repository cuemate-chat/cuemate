import { OpenAICompatibleConfig, OpenAICompatibleProvider } from './openai-compatible.js';

export interface VllmConfig extends Partial<OpenAICompatibleConfig> {
  baseUrl: string;
  model: string;
}

export class VllmProvider extends OpenAICompatibleProvider {
  constructor(cfg: VllmConfig) {
    super({
      id: 'vllm',
      baseUrl: cfg.baseUrl,
      model: cfg.model,
      temperature: cfg.temperature ?? 0.7,
      maxTokens: cfg.maxTokens ?? 2000,
    });
  }
}
