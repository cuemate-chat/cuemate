import { OpenAICompatibleConfig, OpenAICompatibleProvider } from './openai-compatible.js';

export interface AzureOpenAIConfig extends Partial<OpenAICompatibleConfig> {
  baseUrl: string; // https://{resource}.openai.azure.com/openai/deployments/{deployment}/
  apiKey: string;
  model: string; // 部署名称
}

export class AzureOpenAIProvider extends OpenAICompatibleProvider {
  constructor(cfg: AzureOpenAIConfig) {
    super({
      id: 'azure-openai',
      baseUrl: cfg.baseUrl,
      apiKey: cfg.apiKey,
      model: cfg.model,
      temperature: cfg.temperature ?? 0.7,
      maxTokens: cfg.maxTokens ?? 2000,
    });
  }
}
