import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import { BaseLLMProvider, CompletionRequest, CompletionResponse, RuntimeConfig } from './base.js';

export class GeminiProvider extends BaseLLMProvider {
  constructor() {
    super('gemini');
  }

  async complete(request: CompletionRequest, config: RuntimeConfig): Promise<CompletionResponse> {
    // 从 RuntimeConfig 中解析参数
    const apiKey = config.credentials.api_key || process.env.GEMINI_API_KEY;
    const baseUrl = config.credentials.base_url || process.env.GEMINI_BASE_URL;
    
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    // 从 model_params 中解析参数
    const temperature = config.model_params.find(p => p.param_key === 'temperature')?.value || 0.7;
    const maxTokens = config.model_params.find(p => p.param_key === 'max_tokens')?.value || 2000;

    // 创建临时客户端
    const client = new OpenAI({
      apiKey: apiKey,
      ...(baseUrl && { baseURL: baseUrl }),
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
        provider: 'gemini',
        latency,
      };
    } catch (error) {
      logger.error('Gemini completion failed:', error);
      throw error;
    }
  }

  async *stream(request: CompletionRequest, config: RuntimeConfig): AsyncGenerator<string> {
    const apiKey = config.credentials.api_key || process.env.GEMINI_API_KEY;
    const baseUrl = config.credentials.base_url || process.env.GEMINI_BASE_URL;
    
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    const temperature = config.model_params.find(p => p.param_key === 'temperature')?.value || 0.7;
    const maxTokens = config.model_params.find(p => p.param_key === 'max_tokens')?.value || 2000;

    const client = new OpenAI({
      apiKey: apiKey,
      ...(baseUrl && { baseURL: baseUrl }),
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
      logger.error('Gemini stream failed:', error);
      throw error;
    }
  }

  async healthCheck(config: RuntimeConfig): Promise<boolean> {
    const apiKey = config.credentials.api_key || process.env.GEMINI_API_KEY;
    const baseUrl = config.credentials.base_url || process.env.GEMINI_BASE_URL;
    
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    const client = new OpenAI({
      apiKey: apiKey,
      ...(baseUrl && { baseURL: baseUrl }),
    });

    try {
      await client.chat.completions.create({
        model: config.model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
        temperature: 0,
      });
      return true;
    } catch (error) {
      logger.error('Gemini healthCheck failed:', error);
      throw error;
    }
  }
}
