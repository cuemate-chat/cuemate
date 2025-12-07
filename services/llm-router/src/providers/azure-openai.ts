import { AzureOpenAI } from 'openai';
import { createModuleLogger } from '../utils/logger.js';
import { BaseLLMProvider, CompletionRequest, CompletionResponse, RuntimeConfig } from './base.js';

const log = createModuleLogger('AzureOpenAIProvider');

export class AzureOpenAIProvider extends BaseLLMProvider {
  constructor() {
    super('azure-openai');
  }

  async complete(request: CompletionRequest, config: RuntimeConfig): Promise<CompletionResponse> {
    // 从 RuntimeConfig 中解析参数
    const apiKey = config.credentials.api_key;
    const baseUrl = config.credentials.base_url;
    const apiVersion = config.credentials.api_version || '2024-06-01';
    const deploymentName = config.credentials.deployment_name;

    if (!apiKey || !baseUrl) {
      throw new Error('Azure OpenAI requires api_key and base_url in credentials');
    }

    if (!deploymentName) {
      throw new Error('Azure OpenAI requires deployment_name in credentials');
    }

    // 从 modelParams 中解析参数
    const temperature = config.model_params.find(p => p.param_key === 'temperature')?.value || 0.7;
    const maxTokens = config.model_params.find(p => p.param_key === 'max_tokens')?.value || 2000;

    // 创建 Azure OpenAI 客户端
    const client = new AzureOpenAI({
      apiKey: apiKey,
      endpoint: baseUrl,
      apiVersion: apiVersion,
      deployment: deploymentName,
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
        provider: 'azure-openai',
        latency,
      };
    } catch (error) {
      log.error('complete', 'Azure OpenAI completion failed', {}, error);
      throw error;
    }
  }

  async *stream(request: CompletionRequest, config: RuntimeConfig): AsyncGenerator<string> {
    const apiKey = config.credentials.api_key;
    const baseUrl = config.credentials.base_url;
    const apiVersion = config.credentials.api_version || '2024-06-01';
    const deploymentName = config.credentials.deployment_name;

    if (!apiKey || !baseUrl) {
      throw new Error('Azure OpenAI requires api_key and base_url in credentials');
    }

    if (!deploymentName) {
      throw new Error('Azure OpenAI requires deployment_name in credentials');
    }

    const temperature = config.model_params.find(p => p.param_key === 'temperature')?.value || 0.7;
    const maxTokens = config.model_params.find(p => p.param_key === 'max_tokens')?.value || 2000;

    const client = new AzureOpenAI({
      apiKey: apiKey,
      endpoint: baseUrl,
      apiVersion: apiVersion,
      deployment: deploymentName,
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
      log.error('stream', 'Azure OpenAI stream failed', {}, error);
      throw error;
    }
  }

  async healthCheck(config: RuntimeConfig): Promise<boolean> {
    const apiKey = config.credentials.api_key;
    const baseUrl = config.credentials.base_url;
    const apiVersion = config.credentials.api_version || '2024-06-01';
    const deploymentName = config.credentials.deployment_name;

    if (!apiKey || !baseUrl) {
      throw new Error('Azure OpenAI requires api_key and base_url in credentials');
    }

    if (!deploymentName) {
      throw new Error('Azure OpenAI requires deployment_name in credentials');
    }

    const client = new AzureOpenAI({
      apiKey: apiKey,
      endpoint: baseUrl,
      apiVersion: apiVersion,
      deployment: deploymentName,
    });

    try {
      try {
        await client.models.list();
        return true;
      } catch {}
      // Azure OpenAI 通常不支持 /models，退化为一次超轻量调用
      try {
        await client.chat.completions.create({
          model: config.model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
          temperature: 0,
        });
        return true;
      } catch (e) {
        log.error('healthCheck', 'Azure OpenAI healthCheck failed', {}, e);
        return false;
      }
    } catch {
      return false;
    }
  }
}
