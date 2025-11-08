import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import { BaseLLMProvider, CompletionRequest, CompletionResponse, RuntimeConfig } from './base.js';

export class BaiduProvider extends BaseLLMProvider {
  constructor() {
    super('baidu');
  }

  async complete(request: CompletionRequest, config: RuntimeConfig): Promise<CompletionResponse> {
    const apiKey = config.credentials.api_key;
    const baseUrl = config.credentials.base_url || 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat';

    if (!apiKey) {
      throw new Error('Baidu API key is required');
    }

    const temperature = config.model_params.find(p => p.param_key === 'temperature')?.value || 0.7;
    const maxTokens = config.model_params.find(p => p.param_key === 'max_tokens')?.value || 2000;

    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: baseUrl,
    });

    const startTime = Date.now();

    try {
      const completion = await client.chat.completions.create({
        model: config.model,
        messages: request.messages,
        temperature: request.temperature ?? temperature,
        max_tokens: request.maxTokens ?? maxTokens,
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
        provider: 'baidu',
        latency,
      };
    } catch (error) {
      logger.error({ err: error }, 'Baidu completion failed');
      throw error;
    }
  }

  async *stream(request: CompletionRequest, config: RuntimeConfig): AsyncGenerator<string> {
    const apiKey = config.credentials.api_key;
    const baseUrl = config.credentials.base_url || 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat';

    if (!apiKey) {
      throw new Error('Baidu API key is required');
    }

    const temperature = config.model_params.find(p => p.param_key === 'temperature')?.value || 0.7;
    const maxTokens = config.model_params.find(p => p.param_key === 'max_tokens')?.value || 2000;

    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: baseUrl,
    });

    try {
      const stream = await client.chat.completions.create({
        model: config.model,
        messages: request.messages,
        temperature: request.temperature ?? temperature,
        max_tokens: request.maxTokens ?? maxTokens,
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
      logger.error({ err: error }, 'Baidu stream failed');
      throw error;
    }
  }

  async healthCheck(config: RuntimeConfig): Promise<boolean> {
    const apiKey = config.credentials.api_key;
    const baseUrl = config.credentials.base_url || 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat';

    if (!apiKey) {
      throw new Error('Baidu API key is required');
    }

    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: baseUrl,
    });

    try {
      await client.chat.completions.create({
        model: config.model,
        messages: [{ role: 'user', content: 'ping' }],
        temperature: 0,
        max_tokens: 1,
      });
      return true;
    } catch (error) {
      logger.error({ err: error }, `Baidu health check failed for model ${config.model}`);
      throw error;
    }
  }
}
