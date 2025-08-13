import { OpenAICompatibleConfig, OpenAICompatibleProvider } from './openai-compatible.js';

export interface QwenConfig extends Partial<OpenAICompatibleConfig> {
  apiKey: string;
  baseUrl?: string;
  model: string;
}

export class QwenProvider extends OpenAICompatibleProvider {
  constructor(cfg: QwenConfig) {
    super({
      id: 'qwen',
      baseUrl: cfg.baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      apiKey: cfg.apiKey,
      model: cfg.model,
      temperature: cfg.temperature ?? 0.7,
      maxTokens: cfg.maxTokens ?? 2000,
    });
  }
}
