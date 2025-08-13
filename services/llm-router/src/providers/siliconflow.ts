import { OpenAICompatibleConfig, OpenAICompatibleProvider } from './openai-compatible.js';

export interface SiliconFlowConfig extends Partial<OpenAICompatibleConfig> {
  apiKey?: string;
  baseUrl?: string;
  model: string;
}

export class SiliconFlowProvider extends OpenAICompatibleProvider {
  constructor(cfg: SiliconFlowConfig) {
    super({
      id: 'siliconflow',
      baseUrl: cfg.baseUrl || process.env.SILICONFLOW_BASE_URL,
      apiKey: cfg.apiKey || process.env.SILICONFLOW_API_KEY,
      model: cfg.model,
      temperature: cfg.temperature ?? 0.7,
      maxTokens: cfg.maxTokens ?? 2000,
    });
  }
}
