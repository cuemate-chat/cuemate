import { OpenAICompatibleConfig, OpenAICompatibleProvider } from './openai-compatible.js';

export interface OllamaConfig extends Partial<OpenAICompatibleConfig> {
  baseUrl: string; // http://localhost:11434
  model: string; // llama3.1:8b 等
}

export class OllamaProvider extends OpenAICompatibleProvider {
  constructor(cfg: OllamaConfig) {
    super({
      id: 'ollama',
      baseUrl: cfg.baseUrl,
      model: cfg.model,
      temperature: cfg.temperature ?? 0.3,
      maxTokens: cfg.maxTokens ?? 1024,
    });
  }
}
