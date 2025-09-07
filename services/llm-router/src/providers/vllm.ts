import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import { BaseLLMProvider, CompletionRequest, CompletionResponse, RuntimeConfig } from './base.js';

export class VllmProvider extends BaseLLMProvider {
  constructor() {
    super('vllm');
  }

  async complete(request: CompletionRequest, config: RuntimeConfig): Promise<CompletionResponse> {
    // 从 RuntimeConfig 中解析参数
    const baseUrl = config.credentials.base_url;
    const apiKey = config.credentials.api_key || 'dummy'; // vLLM 通常不需要真实 API key
    
    if (!baseUrl) {
      throw new Error('vLLM requires base_url in credentials');
    }

    // 从 model_params 中解析参数
    const temperature = config.model_params.find(p => p.param_key === 'temperature')?.value || 0.7;
    const maxTokens = config.model_params.find(p => p.param_key === 'max_tokens')?.value || 2000;

    // 解析其他动态参数，vLLM 可能有特定的参数
    const additionalParams: any = {};
    config.model_params.forEach(param => {
      if (!['temperature', 'max_tokens'].includes(param.param_key)) {
        additionalParams[param.param_key] = param.value;
      }
    });

    // 从 credentials 中解析其他凭证信息
    const additionalCredentials: any = {};
    Object.keys(config.credentials).forEach(key => {
      if (!['api_key', 'base_url'].includes(key)) {
        additionalCredentials[key] = config.credentials[key];
      }
    });

    // 创建临时客户端
    const client = new OpenAI({
      baseURL: baseUrl,
      apiKey: apiKey,
    });

    const startTime = Date.now();

    try {
      const requestBody: any = {
        model: config.model,
        messages: request.messages,
        temperature: request.temperature ?? temperature,
        max_tokens: request.maxTokens ?? maxTokens,
        stream: false,
        ...additionalParams, // 添加其他动态参数
        ...additionalCredentials, // 添加其他凭证参数
      };

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
        provider: 'vllm',
        latency,
      };
    } catch (error) {
      logger.error('vLLM completion failed:', error);
      throw error;
    }
  }

  async *stream(request: CompletionRequest, config: RuntimeConfig): AsyncGenerator<string> {
    const baseUrl = config.credentials.base_url;
    const apiKey = config.credentials.api_key || 'dummy';
    
    if (!baseUrl) {
      throw new Error('vLLM requires base_url in credentials');
    }

    const temperature = config.model_params.find(p => p.param_key === 'temperature')?.value || 0.7;
    const maxTokens = config.model_params.find(p => p.param_key === 'max_tokens')?.value || 2000;

    const additionalParams: any = {};
    config.model_params.forEach(param => {
      if (!['temperature', 'max_tokens'].includes(param.param_key)) {
        additionalParams[param.param_key] = param.value;
      }
    });

    const additionalCredentials: any = {};
    Object.keys(config.credentials).forEach(key => {
      if (!['api_key', 'base_url'].includes(key)) {
        additionalCredentials[key] = config.credentials[key];
      }
    });

    const client = new OpenAI({
      baseURL: baseUrl,
      apiKey: apiKey,
    });

    try {
      const requestBody: any = {
        model: config.model,
        messages: request.messages,
        temperature: request.temperature ?? temperature,
        max_tokens: request.maxTokens ?? maxTokens,
        stream: true,
        ...additionalParams,
        ...additionalCredentials,
      };

      const stream = await client.chat.completions.create(requestBody) as any;

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      logger.error('vLLM stream failed:', error);
      throw error;
    }
  }

  async healthCheck(config: RuntimeConfig): Promise<boolean> {
    const baseUrl = config.credentials.base_url;
    const apiKey = config.credentials.api_key || 'dummy';
    
    if (!baseUrl) {
      throw new Error('vLLM requires base_url in credentials');
    }

    try {
      const client = new OpenAI({
        baseURL: baseUrl,
        apiKey: apiKey,
      });
      
      // 先尝试获取模型列表
      try {
        await client.models.list();
        return true;
      } catch {}
      
      // 如果模型列表失败，尝试做一次轻量调用
      try {
        await client.chat.completions.create({
          model: config.model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
          temperature: 0,
        });
        return true;
      } catch (e) {
        logger.error('vLLM healthCheck failed:', e);
        return false;
      }
    } catch (error) {
      logger.error('vLLM healthCheck client creation failed:', error);
      return false;
    }
  }
}
