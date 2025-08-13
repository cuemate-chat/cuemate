import { OpenAICompatibleConfig, OpenAICompatibleProvider } from './openai-compatible.js';

export interface ZhipuConfig extends Partial<OpenAICompatibleConfig> {
  apiKey: string;
  model: string;
}

export class ZhipuProvider extends OpenAICompatibleProvider {
  constructor(cfg: ZhipuConfig) {
    super({
      id: 'zhipu',
      baseUrl: cfg.baseUrl || 'https://open.bigmodel.cn/api/paas/v4',
      apiKey: cfg.apiKey,
      model: cfg.model,
      temperature: cfg.temperature ?? 0.7,
      maxTokens: cfg.maxTokens ?? 2000,
    });
  }
}
