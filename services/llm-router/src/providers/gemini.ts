import { OpenAICompatibleProvider } from './openai-compatible.js';

export interface GeminiConfig {
  apiKey?: string;
  baseUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  [key: string]: any; // 允许其他动态字段
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
      // 传递其他动态字段（除了已明确指定的）
      ...Object.fromEntries(
        Object.entries(cfg).filter(
          ([key]) => !['baseUrl', 'apiKey', 'model', 'temperature', 'maxTokens'].includes(key),
        ),
      ),
    });
  }
}
