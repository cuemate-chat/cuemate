import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import { OpenAICompatibleProvider } from './openai-compatible.js';

export interface AzureOpenAIConfig {
  baseUrl: string; // https://{resource}.openai.azure.com/openai/deployments/{deployment}/
  apiKey: string;
  model: string; // 部署名称
  api_version?: string;
  deployment_name?: string;
  temperature?: number;
  maxTokens?: number;
  [key: string]: any; // 允许其他动态字段
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
      // 传递其他动态字段（除了已明确指定的）
      ...Object.fromEntries(
        Object.entries(cfg).filter(
          ([key]) => !['baseUrl', 'apiKey', 'model', 'temperature', 'maxTokens'].includes(key),
        ),
      ),
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      const client = new OpenAI({
        apiKey: (this as any).config.apiKey,
        baseURL: (this as any).config.baseUrl,
      });
      try {
        await client.models.list();
        return true;
      } catch {}
      // Azure OpenAI 通常不支持 /models，退化为一次超轻量调用
      try {
        await client.chat.completions.create({
          model: (this as any).config.model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
          temperature: 0,
        });
        return true;
      } catch (e) {
        logger.error('Azure OpenAI healthCheck failed', e as any);
        return false;
      }
    } catch {
      return false;
    }
  }
}
