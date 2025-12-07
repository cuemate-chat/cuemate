import OpenAI from 'openai';
import { createModuleLogger } from '../utils/logger.js';
import { BaseLLMProvider, CompletionRequest, CompletionResponse, RuntimeConfig } from './base.js';

const log = createModuleLogger('XfProvider');

export class XfProvider extends BaseLLMProvider {
  constructor() {
    super('xf');
  }

  async complete(request: CompletionRequest, config: RuntimeConfig): Promise<CompletionResponse> {
    const apiKey = config.credentials.api_key;
    const isX1Model = config.model === 'x1' || config.model === 'X1-Preview';
    const defaultBaseUrl = isX1Model
      ? 'https://spark-api-open.xf-yun.com/v2'
      : 'https://spark-api-open.xf-yun.com/v1';
    const baseUrl = config.credentials.base_url || defaultBaseUrl;

    if (!apiKey) {
      throw new Error('讯飞星火 API key is required');
    }

    const temperature = config.model_params.find(p => p.param_key === 'temperature')?.value || 0.5;
    const maxTokens = config.model_params.find(p => p.param_key === 'max_tokens')?.value || 8192;

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
        provider: 'xf',
        latency,
      };
    } catch (error) {
      log.error('complete', '讯飞星火 completion failed', {}, error);
      throw error;
    }
  }

  async *stream(request: CompletionRequest, config: RuntimeConfig): AsyncGenerator<string> {
    const apiKey = config.credentials.api_key;
    const isX1Model = config.model === 'x1' || config.model === 'X1-Preview';
    const defaultBaseUrl = isX1Model
      ? 'https://spark-api-open.xf-yun.com/v2'
      : 'https://spark-api-open.xf-yun.com/v1';
    const baseUrl = config.credentials.base_url || defaultBaseUrl;

    if (!apiKey) {
      throw new Error('讯飞星火 API key is required');
    }

    const temperature = config.model_params.find(p => p.param_key === 'temperature')?.value || 0.5;
    const maxTokens = config.model_params.find(p => p.param_key === 'max_tokens')?.value || 8192;

    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: baseUrl,
    });

    try {
      const stream = await client.chat.completions.create({
        model: config.model,
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
      log.error('stream', '讯飞星火 stream failed', {}, error);
      throw error;
    }
  }

  async healthCheck(config: RuntimeConfig): Promise<boolean> {
    const apiKey = config.credentials.api_key;
    const isX1Model = config.model === 'x1' || config.model === 'X1-Preview';
    const defaultBaseUrl = isX1Model
      ? 'https://spark-api-open.xf-yun.com/v2'
      : 'https://spark-api-open.xf-yun.com/v1';
    const baseUrl = config.credentials.base_url || defaultBaseUrl;

    if (!apiKey) {
      throw new Error('讯飞星火 API key is required');
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
      log.error('healthCheck', `讯飞星火 health check failed for model ${config.model}`, {}, error);
      throw error;
    }
  }
}
