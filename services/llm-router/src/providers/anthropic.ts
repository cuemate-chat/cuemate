import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger.js';
import { BaseLLMProvider, CompletionRequest, CompletionResponse, RuntimeConfig } from './base.js';

export class AnthropicProvider extends BaseLLMProvider {
  constructor() {
    super('anthropic');
  }

  async complete(request: CompletionRequest, config: RuntimeConfig): Promise<CompletionResponse> {
    const apiKey = config.credentials.api_key;
    const baseUrl = config.credentials.base_url || 'https://api.anthropic.com';

    if (!apiKey) {
      throw new Error('Anthropic API key is required');
    }

    const temperature = config.model_params.find(p => p.param_key === 'temperature')?.value || 0.7;
    const maxTokens = config.model_params.find(p => p.param_key === 'max_tokens')?.value || 2000;

    const client = new Anthropic({
      apiKey: apiKey,
      baseURL: baseUrl,
    });

    const startTime = Date.now();

    try {
      // 转换 messages 格式：分离 system 消息
      const systemMessages = request.messages.filter(m => m.role === 'system');
      const userMessages = request.messages.filter(m => m.role !== 'system');

      const systemPrompt = systemMessages.map(m => m.content).join('\n');

      const response = await client.messages.create({
        model: config.model,
        max_tokens: request.maxTokens ?? maxTokens,
        temperature: request.temperature ?? temperature,
        system: systemPrompt || undefined,
        messages: userMessages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      });

      const latency = Date.now() - startTime;
      const content = response.content[0]?.type === 'text' ? response.content[0].text : '';

      return {
        content,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        model: response.model,
        provider: 'anthropic',
        latency,
      };
    } catch (error) {
      logger.error({ err: error }, 'Anthropic completion failed:');
      throw error;
    }
  }

  async *stream(request: CompletionRequest, config: RuntimeConfig): AsyncGenerator<string> {
    const apiKey = config.credentials.api_key;
    const baseUrl = config.credentials.base_url || 'https://api.anthropic.com';

    if (!apiKey) {
      throw new Error('Anthropic API key is required');
    }

    const temperature = config.model_params.find(p => p.param_key === 'temperature')?.value || 0.7;
    const maxTokens = config.model_params.find(p => p.param_key === 'max_tokens')?.value || 2000;

    const client = new Anthropic({
      apiKey: apiKey,
      baseURL: baseUrl,
    });

    try {
      const systemMessages = request.messages.filter(m => m.role === 'system');
      const userMessages = request.messages.filter(m => m.role !== 'system');

      const systemPrompt = systemMessages.map(m => m.content).join('\n');

      const stream = client.messages.stream({
        model: config.model,
        max_tokens: request.maxTokens ?? maxTokens,
        temperature: request.temperature ?? temperature,
        system: systemPrompt || undefined,
        messages: userMessages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          yield chunk.delta.text;
        }
      }
    } catch (error) {
      logger.error({ err: error }, 'Anthropic stream failed:');
      throw error;
    }
  }

  async healthCheck(config: RuntimeConfig): Promise<boolean> {
    const apiKey = config.credentials.api_key;
    const baseUrl = config.credentials.base_url || 'https://api.anthropic.com';

    if (!apiKey) {
      throw new Error('Anthropic API key is required');
    }

    const client = new Anthropic({
      apiKey: apiKey,
      baseURL: baseUrl,
    });

    try {
      await client.messages.create({
        model: config.model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return true;
    } catch (error) {
      logger.error({ err: error }, 'Anthropic healthCheck failed:');
      throw error;
    }
  }
}
