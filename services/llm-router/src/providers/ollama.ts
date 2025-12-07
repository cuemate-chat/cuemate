import OpenAI from 'openai';
import { createModuleLogger } from '../utils/logger.js';
import { BaseLLMProvider, CompletionRequest, CompletionResponse, RuntimeConfig } from './base.js';

const log = createModuleLogger('OllamaProvider');

export class OllamaProvider extends BaseLLMProvider {
  constructor() {
    super('ollama');
  }

  async complete(request: CompletionRequest, config: RuntimeConfig): Promise<CompletionResponse> {
    // 从 RuntimeConfig 中解析参数
    const baseUrl = config.credentials.base_url; // http://localhost:11434 或 https://api.ollama.com
    const apiKey = config.credentials.api_key; // 云端 API 需要

    if (!baseUrl) {
      throw new Error('Ollama requires base_url in credentials');
    }

    // 从 modelParams 中解析参数
    const temperature = config.modelParams.find(p => p.paramKey === 'temperature')?.value || 0.3;
    const maxTokens = config.modelParams.find(p => p.paramKey === 'max_tokens')?.value || 1024;
    const numPredict = config.modelParams.find(p => p.paramKey === 'num_predict')?.value; // Ollama 特有

    // 创建临时客户端（本地 Ollama 不需要 API key，云端需要）
    const client = new OpenAI({
      baseURL: baseUrl,
      apiKey: apiKey || 'ollama', // 优先使用用户提供的 API key，否则使用默认值
    });

    const startTime = Date.now();

    try {
      const requestBody: any = {
        model: config.model,
        messages: request.messages,
        temperature: request.temperature ?? temperature,
        max_tokens: request.max_tokens ?? maxTokens,
        stream: false,
      };
      
      // 添加 Ollama 特有参数
      if (numPredict) {
        requestBody.num_predict = numPredict;
      }

      const completion = await client.chat.completions.create(requestBody);

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
        provider: 'ollama',
        latency,
      };
    } catch (error) {
      log.error('complete', 'Ollama completion failed', {}, error);
      throw error;
    }
  }

  async *stream(request: CompletionRequest, config: RuntimeConfig): AsyncGenerator<string> {
    const baseUrl = config.credentials.base_url;
    const apiKey = config.credentials.api_key;

    if (!baseUrl) {
      throw new Error('Ollama requires base_url in credentials');
    }

    const temperature = config.modelParams.find(p => p.paramKey === 'temperature')?.value || 0.3;
    const maxTokens = config.modelParams.find(p => p.paramKey === 'max_tokens')?.value || 1024;
    const numPredict = config.modelParams.find(p => p.paramKey === 'num_predict')?.value;

    const client = new OpenAI({
      baseURL: baseUrl,
      apiKey: apiKey || 'ollama',
    });

    try {
      const requestBody: any = {
        model: config.model,
        messages: request.messages,
        temperature: request.temperature ?? temperature,
        max_tokens: request.max_tokens ?? maxTokens,
        stream: true,
        stream_options: { include_usage: true },
      };
      
      if (numPredict) {
        requestBody.num_predict = numPredict;
      }

      const stream = await client.chat.completions.create(requestBody) as any;

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
      log.error('stream', 'Ollama stream failed', {}, error);
      throw error;
    }
  }

  async healthCheck(config: RuntimeConfig): Promise<boolean> {
    const baseUrl = config.credentials.base_url;
    const apiKey = config.credentials.api_key;

    if (!baseUrl) {
      throw new Error('Ollama requires base_url in credentials');
    }

    const client = new OpenAI({
      baseURL: baseUrl,
      apiKey: apiKey || 'ollama',
    });

    try {
      try {
        await client.models.list();
        return true;
      } catch {}
      try {
        await client.chat.completions.create({
          model: config.model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
          temperature: 0,
        });
        return true;
      } catch (e) {
        log.error('healthCheck', 'Ollama healthCheck failed', {}, e);
        return false;
      }
    } catch {
      return false;
    }
  }
}
