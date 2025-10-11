import axios from 'axios';
import { logger } from '../utils/logger.js';
import { BaseLLMProvider, CompletionRequest, CompletionResponse, RuntimeConfig } from './base.js';

export class MoonshotProvider extends BaseLLMProvider {
  constructor() {
    super('moonshot');
  }

  async complete(request: CompletionRequest, config: RuntimeConfig): Promise<CompletionResponse> {
    // 从 RuntimeConfig 中解析参数
    const apiKey = config.credentials.api_key;
    const baseUrl = config.credentials.base_url || 'https://api.moonshot.cn/v1';
    
    if (!apiKey) {
      throw new Error('Moonshot API key not configured');
    }

    // 从 model_params 中解析参数
    const temperature = config.model_params.find(p => p.param_key === 'temperature')?.value || 0.7;
    const maxTokens = config.model_params.find(p => p.param_key === 'max_tokens')?.value || 2000;

    const startTime = Date.now();

    try {
      const response = await axios.post(
        `${baseUrl}/chat/completions`,
        {
          model: config.model,
          messages: request.messages,
          temperature: request.temperature || temperature,
          max_tokens: request.maxTokens || maxTokens,
          stream: false,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const latency = Date.now() - startTime;
      const completion = response.data;

      return {
        content: completion.choices[0]?.message?.content || '',
        usage: completion.usage
          ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            }
          : undefined,
        model: completion.model,
        provider: 'moonshot',
        latency,
      };
    } catch (error) {
      logger.error({ err: error }, 'Moonshot completion failed:');
      throw error;
    }
  }

  async *stream(request: CompletionRequest, config: RuntimeConfig): AsyncGenerator<string> {
    const apiKey = config.credentials.api_key;
    const baseUrl = config.credentials.base_url || 'https://api.moonshot.cn/v1';
    
    if (!apiKey) {
      throw new Error('Moonshot API key not configured');
    }

    const temperature = config.model_params.find(p => p.param_key === 'temperature')?.value || 0.7;
    const maxTokens = config.model_params.find(p => p.param_key === 'max_tokens')?.value || 2000;

    try {
      const response = await axios.post(
        `${baseUrl}/chat/completions`,
        {
          model: config.model,
          messages: request.messages,
          temperature: request.temperature || temperature,
          max_tokens: request.maxTokens || maxTokens,
          stream: true,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          responseType: 'stream',
        },
      );

      const stream = response.data;
      let buffer = '';

      for await (const chunk of stream) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }
            try {
              const json = JSON.parse(data);
              const content = json.choices[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      logger.error({ err: error }, 'Moonshot stream failed:');
      throw error;
    }
  }

  async healthCheck(config: RuntimeConfig): Promise<boolean> {
    const apiKey = config.credentials.api_key;
    const baseUrl = config.credentials.base_url || 'https://api.moonshot.cn/v1';
    
    if (!apiKey) {
      return false;
    }

    try {
      await axios.get(`${baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 5000,
      });
      return true;
    } catch (error) {
      logger.error({ err: error }, 'Moonshot health check failed:');
      return false;
    }
  }
}
