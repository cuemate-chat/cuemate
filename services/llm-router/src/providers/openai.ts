import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import { BaseLLMProvider, CompletionRequest, CompletionResponse, RuntimeConfig } from './base.js';

export class OpenAIProvider extends BaseLLMProvider {
  constructor() {
    super('openai');
  }

  async complete(request: CompletionRequest, config: RuntimeConfig): Promise<CompletionResponse> {
    // 从 credentials 和 model_params 中解析 OpenAI 需要的参数
    const apiKey = config.credentials.api_key;
    const baseUrl = config.credentials.base_url;
    
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    // 从 model_params 中解析参数
    const temperature = config.model_params.find(p => p.param_key === 'temperature')?.value || 0.7;
    const maxTokens = config.model_params.find(p => p.param_key === 'max_tokens')?.value || 2000;

    // 创建临时客户端
    const client = new OpenAI({
      apiKey: apiKey,
      ...(baseUrl && baseUrl !== 'https://api.openai.com/v1' && { baseURL: baseUrl }),
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
        provider: 'openai',
        latency,
      };
    } catch (error) {
      logger.error('OpenAI completion failed:', error);
      throw error;
    }
  }

  async *stream(request: CompletionRequest, config: RuntimeConfig): AsyncGenerator<string> {
    // 从 credentials 和 model_params 中解析参数
    const apiKey = config.credentials.api_key;
    const baseUrl = config.credentials.base_url;
    
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const temperature = config.model_params.find(p => p.param_key === 'temperature')?.value || 0.7;
    const maxTokens = config.model_params.find(p => p.param_key === 'max_tokens')?.value || 2000;

    // 创建临时客户端
    const client = new OpenAI({
      apiKey: apiKey,
      ...(baseUrl && baseUrl !== 'https://api.openai.com/v1' && { baseURL: baseUrl }),
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
      logger.error('OpenAI stream failed:', error);
      throw error;
    }
  }

  async healthCheck(config: RuntimeConfig): Promise<boolean> {
    const apiKey = config.credentials.api_key;
    const baseUrl = config.credentials.base_url;
    
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    // 创建临时客户端
    const client = new OpenAI({
      apiKey: apiKey,
      ...(baseUrl && baseUrl !== 'https://api.openai.com/v1' && { baseURL: baseUrl }),
    });

    try {
      // 先尝试列出模型（快速检查API连接性）
      try {
        await client.models.list();
      } catch {}
      
      // 然后实际测试指定模型是否可用 - 发送一个简单的测试请求
      await client.chat.completions.create({
        model: config.model,
        messages: [{ role: 'user', content: 'ping' }],
        temperature: 0,
        max_tokens: 1,
      });
      return true;
    } catch (error) {
      logger.error(`OpenAI health check failed for model ${config.model}:`, error);
      // 抛出异常而不是返回false，这样路由可以捕获具体的错误信息
      throw error;
    }
  }
}