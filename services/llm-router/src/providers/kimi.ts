import OpenAI from 'openai';
import { createModuleLogger } from '../utils/logger.js';
import { BaseLLMProvider, CompletionRequest, CompletionResponse, RuntimeConfig } from './base.js';

const log = createModuleLogger('KimiProvider');

export class KimiProvider extends BaseLLMProvider {
  constructor() {
    super('kimi');
  }

  async complete(request: CompletionRequest, config: RuntimeConfig): Promise<CompletionResponse> {
    // 从 RuntimeConfig 中解析参数
    const apiKey = config.credentials.api_key || process.env.KIMI_API_KEY;
    const baseUrl = config.credentials.base_url || 'https://api.moonshot.cn/v1';
    
    if (!apiKey) {
      throw new Error('Kimi API key is required');
    }

    // 从 modelParams 中解析参数
    const temperature = config.modelParams.find(p => p.paramKey === 'temperature')?.value || 0.7;
    const maxTokens = config.modelParams.find(p => p.paramKey === 'max_tokens')?.value || 2000;

    // 创建临时客户端
    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: baseUrl,
    });

    const startTime = Date.now();

    try {
      const completion = await client.chat.completions.create({
        model: config.model || process.env.KIMI_MODEL || 'moonshot-v1-32k',
        messages: request.messages,
        temperature: request.temperature ?? temperature,
        max_tokens: request.max_tokens ?? maxTokens,
        stream: false,
      });

      const response = completion.choices[0];
      const latency = Date.now() - startTime;

      return {
        content: response.message?.content || '',
        usage: completion.usage
          ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            }
          : undefined,
        model: completion.model,
        provider: 'kimi',
        latency,
      };
    } catch (error) {
      log.error('complete', 'Kimi completion failed', {}, error);
      throw error;
    }
  }

  async *stream(request: CompletionRequest, config: RuntimeConfig): AsyncGenerator<string> {
    const apiKey = config.credentials.api_key || process.env.KIMI_API_KEY;
    const baseUrl = config.credentials.base_url || 'https://api.moonshot.cn/v1';
    
    if (!apiKey) {
      throw new Error('Kimi API key is required');
    }

    const temperature = config.modelParams.find(p => p.paramKey === 'temperature')?.value || 0.7;
    const maxTokens = config.modelParams.find(p => p.paramKey === 'max_tokens')?.value || 2000;

    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: baseUrl,
    });

    try {
      const stream = await client.chat.completions.create({
        model: config.model || process.env.KIMI_MODEL || 'moonshot-v1-32k',
        messages: request.messages,
        temperature: request.temperature ?? temperature,
        max_tokens: request.max_tokens ?? maxTokens,
        stream: true,
        stream_options: { include_usage: true },
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }

        if (chunk.usage) {
          yield JSON.stringify({
            usage: {
              promptTokens: chunk.usage.prompt_tokens,
              completionTokens: chunk.usage.completion_tokens,
              totalTokens: chunk.usage.total_tokens,
            },
          });
        }
      }
    } catch (error) {
      log.error('stream', 'Kimi stream failed', {}, error);
      throw error;
    }
  }

  async healthCheck(config: RuntimeConfig): Promise<boolean> {
    const apiKey = config.credentials.api_key || process.env.KIMI_API_KEY;
    const baseUrl = config.credentials.base_url || 'https://api.moonshot.cn/v1';
    
    if (!apiKey) {
      throw new Error('Kimi API key is required');
    }

    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: baseUrl,
    });

    try {
      try {
        await client.models.list();
        return true;
      } catch {}
      try {
        await client.chat.completions.create({
          model: config.model || process.env.KIMI_MODEL || 'moonshot-v1-32k',
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
          temperature: 0,
        });
        return true;
      } catch (e) {
        log.error('healthCheck', 'Kimi healthCheck failed', {}, e);
        return false;
      }
    } catch {
      return false;
    }
  }
}
