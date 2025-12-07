import OpenAI from 'openai';
import { createModuleLogger } from '../utils/logger.js';
import { BaseLLMProvider, CompletionRequest, CompletionResponse, RuntimeConfig } from './base.js';

const log = createModuleLogger('SiliconFlowProvider');

export class SiliconFlowProvider extends BaseLLMProvider {
  constructor() {
    super('siliconflow');
  }

  async complete(request: CompletionRequest, config: RuntimeConfig): Promise<CompletionResponse> {
    // 从 RuntimeConfig 中解析参数
    const apiKey = config.credentials.api_key || process.env.SILICONFLOW_API_KEY;
    const baseUrl = config.credentials.base_url || process.env.SILICONFLOW_BASE_URL;
    
    if (!apiKey) {
      throw new Error('SiliconFlow API key is required');
    }

    // 从 modelParams 中解析参数
    const temperature = config.model_params.find(p => p.param_key === 'temperature')?.value || 0.7;
    const maxTokens = config.model_params.find(p => p.param_key === 'max_tokens')?.value || 2000;

    // 解析其他动态参数
    const additionalParams: any = {};
    config.model_params.forEach(param => {
      if (!['temperature', 'max_tokens'].includes(param.param_key)) {
        additionalParams[param.param_key] = param.value;
      }
    });

    // 创建临时客户端
    const client = new OpenAI({
      apiKey: apiKey,
      ...(baseUrl && { baseURL: baseUrl }),
    });

    const startTime = Date.now();

    try {
      const requestBody: any = {
        model: config.model,
        messages: request.messages,
        temperature: request.temperature ?? temperature,
        max_tokens: request.max_tokens ?? maxTokens,
        stream: false,
        ...additionalParams, // 添加其他动态参数
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
        provider: 'siliconflow',
        latency,
      };
    } catch (error) {
      log.error('complete', 'SiliconFlow completion failed', {}, error);
      throw error;
    }
  }

  async *stream(request: CompletionRequest, config: RuntimeConfig): AsyncGenerator<string> {
    const apiKey = config.credentials.api_key || process.env.SILICONFLOW_API_KEY;
    const baseUrl = config.credentials.base_url || process.env.SILICONFLOW_BASE_URL;
    
    if (!apiKey) {
      throw new Error('SiliconFlow API key is required');
    }

    const temperature = config.model_params.find(p => p.param_key === 'temperature')?.value || 0.7;
    const maxTokens = config.model_params.find(p => p.param_key === 'max_tokens')?.value || 2000;

    const additionalParams: any = {};
    config.model_params.forEach(param => {
      if (!['temperature', 'max_tokens'].includes(param.param_key)) {
        additionalParams[param.param_key] = param.value;
      }
    });

    const client = new OpenAI({
      apiKey: apiKey,
      ...(baseUrl && { baseURL: baseUrl }),
    });

    try {
      const requestBody: any = {
        model: config.model,
        messages: request.messages,
        temperature: request.temperature ?? temperature,
        max_tokens: request.max_tokens ?? maxTokens,
        stream: true,
        stream_options: { include_usage: true },
        ...additionalParams,
      };

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
      log.error('stream', 'SiliconFlow stream failed', {}, error);
      throw error;
    }
  }

  async healthCheck(config: RuntimeConfig): Promise<boolean> {
    const apiKey = config.credentials.api_key || process.env.SILICONFLOW_API_KEY;
    const baseUrl = config.credentials.base_url || process.env.SILICONFLOW_BASE_URL;
    
    if (!apiKey) {
      throw new Error('SiliconFlow API key is required');
    }

    const client = new OpenAI({
      apiKey: apiKey,
      ...(baseUrl && { baseURL: baseUrl }),
    });

    try {
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
        log.error('healthCheck', 'SiliconFlow healthCheck failed', {}, e);
        return false;
      }
    } catch (error) {
      log.error('healthCheck', 'SiliconFlow healthCheck client creation failed', {}, error);
      return false;
    }
  }
}
