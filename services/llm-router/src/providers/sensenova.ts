import { createModuleLogger } from '../utils/logger.js';
import { BaseLLMProvider, CompletionRequest, CompletionResponse, RuntimeConfig } from './base.js';

const log = createModuleLogger('SenseNovaProvider');

export class SenseNovaProvider extends BaseLLMProvider {
  constructor() {
    super('sensenova');
  }

  async complete(request: CompletionRequest, config: RuntimeConfig): Promise<CompletionResponse> {
    const apiKey = config.credentials.api_key;
    const baseUrl = config.credentials.base_url || 'https://api.sensenova.cn';

    if (!apiKey) {
      throw new Error('SenseNova API key is required');
    }

    const temperature = config.model_params.find(p => p.param_key === 'temperature')?.value || 0.7;
    const maxTokens = config.model_params.find(p => p.param_key === 'max_tokens')?.value || 2000;

    const url = `${baseUrl}/v1/llm/chat-completions`;
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: request.messages,
          temperature: request.temperature ?? temperature,
          max_new_tokens: request.max_tokens ?? maxTokens,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SenseNova API error: ${response.status} ${errorText}`);
      }

      const result = await response.json() as any;
      const data = result.data;
      const latency = Date.now() - startTime;

      return {
        content: data.choices[0]?.message || '',
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
        model: config.model,
        provider: 'sensenova',
        latency,
      };
    } catch (error) {
      log.error('complete', 'SenseNova completion failed', {}, error);
      throw error;
    }
  }

  async *stream(request: CompletionRequest, config: RuntimeConfig): AsyncGenerator<string> {
    const apiKey = config.credentials.api_key;
    const baseUrl = config.credentials.base_url || 'https://api.sensenova.cn';

    if (!apiKey) {
      throw new Error('SenseNova API key is required');
    }

    const temperature = config.model_params.find(p => p.param_key === 'temperature')?.value || 0.7;
    const maxTokens = config.model_params.find(p => p.param_key === 'max_tokens')?.value || 2000;

    const url = `${baseUrl}/v1/llm/chat-completions`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: request.messages,
          temperature: request.temperature ?? temperature,
          max_new_tokens: request.max_tokens ?? maxTokens,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SenseNova API error: ${response.status} ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const responseData = parsed.data;
              const content = responseData.choices?.[0]?.delta || responseData.choices?.[0]?.message;
              if (content) {
                yield typeof content === 'string' ? content : content.content || '';
              }

              if (responseData.usage) {
                yield JSON.stringify({
                  usage: {
                    promptTokens: responseData.usage.prompt_tokens,
                    completionTokens: responseData.usage.completion_tokens,
                    totalTokens: responseData.usage.total_tokens,
                  },
                });
              }
            } catch (e) {
              log.warn('stream', 'Failed to parse SSE data', { data });
            }
          }
        }
      }
    } catch (error) {
      log.error('stream', 'SenseNova stream failed', {}, error);
      throw error;
    }
  }

  async healthCheck(config: RuntimeConfig): Promise<boolean> {
    const apiKey = config.credentials.api_key;
    const baseUrl = config.credentials.base_url || 'https://api.sensenova.cn';

    if (!apiKey) {
      throw new Error('SenseNova API key is required');
    }

    const url = `${baseUrl}/v1/llm/chat-completions`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: 'ping' }],
          temperature: 0.1,
          max_new_tokens: 5,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SenseNova health check failed: ${response.status} ${errorText}`);
      }

      return true;
    } catch (error) {
      log.error('healthCheck', `SenseNova health check failed for model ${config.model}`, {}, error);
      throw error;
    }
  }
}
