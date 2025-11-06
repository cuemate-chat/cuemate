import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import { BaseLLMProvider, CompletionRequest, CompletionResponse, RuntimeConfig } from './base.js';

export class AliyunProvider extends BaseLLMProvider {
  constructor() {
    super('aliyun-bailian');
  }

  async complete(request: CompletionRequest, config: RuntimeConfig): Promise<CompletionResponse> {
    const apiKey = config.credentials.api_key;
    const baseUrl =
      config.credentials.base_url || 'https://dashscope.aliyuncs.com/compatible-mode/v1';

    if (!apiKey) {
      throw new Error('Aliyun API key is required');
    }

    const temperature =
      config.model_params.find((p) => p.param_key === 'temperature')?.value || 0.7;
    const maxTokens = config.model_params.find((p) => p.param_key === 'max_tokens')?.value || 2048;

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
        extra_body: {
          enable_thinking: false,
        },
      } as any);

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
        provider: 'aliyun-bailian',
        latency,
      };
    } catch (error) {
      logger.error({ err: error }, 'Aliyun completion failed:');
      throw error;
    }
  }

  async *stream(request: CompletionRequest, config: RuntimeConfig): AsyncGenerator<string> {
    const apiKey = config.credentials.api_key;
    const baseUrl =
      config.credentials.base_url || 'https://dashscope.aliyuncs.com/compatible-mode/v1';

    if (!apiKey) {
      throw new Error('Aliyun API key is required');
    }

    const temperature =
      config.model_params.find((p) => p.param_key === 'temperature')?.value || 0.7;
    const maxTokens = config.model_params.find((p) => p.param_key === 'max_tokens')?.value || 2048;

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
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      logger.error({ err: error }, 'Aliyun stream failed:');
      throw error;
    }
  }

  async healthCheck(config: RuntimeConfig): Promise<boolean> {
    const apiKey = config.credentials.api_key;
    const baseUrl =
      config.credentials.base_url || 'https://dashscope.aliyuncs.com/compatible-mode/v1';

    if (!apiKey) {
      throw new Error('Aliyun API key is required');
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
        extra_body: {
          enable_thinking: false,
        },
      } as any);
      return true;
    } catch (error) {
      logger.error({ err: error }, `Aliyun health check failed for model ${config.model}:`);
      throw error;
    }
  }
}
