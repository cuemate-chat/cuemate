import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import { BaseLLMProvider, CompletionRequest, CompletionResponse } from './base.js';

export interface OpenAICompatibleConfig {
  id: string; // provider id
  baseUrl?: string; // 兼容的 Base URL
  apiKey?: string; // API Key（可选，匿名也许支持本地代理）
  model: string; // 模型全名（含版本）
  maxTokens?: number;
  temperature?: number;
}

export class OpenAICompatibleProvider extends BaseLLMProvider {
  private client: OpenAI | null = null;

  constructor(cfg: OpenAICompatibleConfig) {
    super(cfg.id, cfg);
    if ((cfg as any).apiKey || (cfg as any).baseUrl) {
      this.client = new OpenAI({ apiKey: (cfg as any).apiKey, baseURL: (cfg as any).baseUrl });
    }
  }

  isAvailable(): boolean {
    return !!this.client;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    if (!this.client) throw new Error(`${this.name} client not initialized`);
    const { model, temperature, maxTokens } = this.config as OpenAICompatibleConfig;
    const start = Date.now();
    try {
      const r = await this.client.chat.completions.create({
        model: model,
        messages: request.messages,
        temperature: request.temperature ?? temperature,
        max_tokens: request.maxTokens ?? maxTokens,
        stream: false,
      });
      return {
        content: r.choices[0]?.message?.content || '',
        usage: r.usage
          ? {
              promptTokens: r.usage.prompt_tokens,
              completionTokens: r.usage.completion_tokens,
              totalTokens: r.usage.total_tokens,
            }
          : undefined,
        model: r.model,
        provider: this.name,
        latency: Date.now() - start,
      };
    } catch (e) {
      logger.error(`${this.name} completion failed`, e);
      throw e;
    }
  }

  async *stream(request: CompletionRequest): AsyncGenerator<string> {
    if (!this.client) throw new Error(`${this.name} client not initialized`);
    const { model, temperature, maxTokens } = this.config as OpenAICompatibleConfig;
    const s = await this.client.chat.completions.create({
      model,
      messages: request.messages,
      temperature: request.temperature ?? temperature,
      max_tokens: request.maxTokens ?? maxTokens,
      stream: true,
    });
    for await (const ch of s) {
      const c = ch.choices[0]?.delta?.content;
      if (c) yield c;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.client) return false;
    try {
      // 先尝试 /models
      try {
        await this.client.models.list();
        return true;
      } catch {}
      // 退化：做一次最小 chat 请求
      try {
        await this.client.chat.completions.create({
          model: (this.config as any).model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
          temperature: 0,
        });
        return true;
      } catch (e) {
        logger.error(`${this.name} healthCheck failed`, e);
        return false;
      }
    } catch {
      return false;
    }
  }
}
