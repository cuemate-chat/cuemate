import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { logger } from '../utils/logger.js';
import { BaseLLMProvider, CompletionRequest, CompletionResponse, RuntimeConfig } from './base.js';

export class BedrockProvider extends BaseLLMProvider {
  constructor() {
    super('bedrock');
  }

  private createClient(apiKey: string, region: string): BedrockRuntimeClient {
    // AWS Bedrock API Key 通过环境变量 AWS_BEARER_TOKEN_BEDROCK 设置
    // AWS SDK 会自动检测并使用此环境变量进行 Bearer token 认证
    process.env.AWS_BEARER_TOKEN_BEDROCK = apiKey;

    return new BedrockRuntimeClient({
      region: region,
    });
  }

  async complete(request: CompletionRequest, config: RuntimeConfig): Promise<CompletionResponse> {
    const apiKey = config.credentials.api_key;
    const region = config.credentials.aws_region || 'us-east-1';

    if (!apiKey) {
      throw new Error('AWS Bedrock API key is required');
    }

    const temperature =
      config.model_params.find((p) => p.param_key === 'temperature')?.value || 0.7;
    const maxTokens = config.model_params.find((p) => p.param_key === 'max_tokens')?.value || 8192;

    const client = this.createClient(apiKey, region);
    const startTime = Date.now();

    try {
      // 转换消息格式为 AWS Bedrock Converse API 格式
      const messages = request.messages
        .filter((msg) => msg.role !== 'system')
        .map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: [{ text: msg.content }],
        }));

      // 提取 system 消息
      const systemMessages = request.messages.filter((msg) => msg.role === 'system');
      const system =
        systemMessages.length > 0 ? systemMessages.map((m) => ({ text: m.content })) : undefined;

      const command = new ConverseCommand({
        modelId: config.model,
        messages,
        system,
        inferenceConfig: {
          temperature: request.temperature ?? temperature,
          maxTokens: request.maxTokens ?? maxTokens,
        },
      });

      const response = await client.send(command);
      const latency = Date.now() - startTime;

      const output = response.output?.message;
      const usage = response.usage;

      return {
        content: output?.content?.[0]?.text || '',
        usage: usage
          ? {
              promptTokens: usage.inputTokens || 0,
              completionTokens: usage.outputTokens || 0,
              totalTokens: (usage.inputTokens || 0) + (usage.outputTokens || 0),
            }
          : undefined,
        model: config.model,
        provider: 'bedrock',
        latency,
      };
    } catch (error) {
      logger.error({ err: error }, 'AWS Bedrock completion failed:');
      throw error;
    }
  }

  async *stream(request: CompletionRequest, config: RuntimeConfig): AsyncGenerator<string> {
    const apiKey = config.credentials.api_key;
    const region = config.credentials.aws_region || 'us-east-1';

    if (!apiKey) {
      throw new Error('AWS Bedrock API key is required');
    }

    const temperature =
      config.model_params.find((p) => p.param_key === 'temperature')?.value || 0.7;
    const maxTokens = config.model_params.find((p) => p.param_key === 'max_tokens')?.value || 8192;

    const client = this.createClient(apiKey, region);

    try {
      // 转换消息格式
      const messages = request.messages
        .filter((msg) => msg.role !== 'system')
        .map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: [{ text: msg.content }],
        }));

      const systemMessages = request.messages.filter((msg) => msg.role === 'system');
      const system =
        systemMessages.length > 0 ? systemMessages.map((m) => ({ text: m.content })) : undefined;

      const command = new ConverseStreamCommand({
        modelId: config.model,
        messages,
        system,
        inferenceConfig: {
          temperature: request.temperature ?? temperature,
          maxTokens: request.maxTokens ?? maxTokens,
        },
      });

      const response = await client.send(command);

      if (response.stream) {
        for await (const event of response.stream) {
          if (event.contentBlockDelta?.delta?.text) {
            yield event.contentBlockDelta.delta.text;
          }
        }
      }
    } catch (error) {
      logger.error({ err: error }, 'AWS Bedrock stream failed:');
      throw error;
    }
  }

  async healthCheck(config: RuntimeConfig): Promise<boolean> {
    const apiKey = config.credentials.api_key;
    const region = config.credentials.aws_region || 'us-east-1';

    if (!apiKey) {
      throw new Error('AWS Bedrock API key is required');
    }

    const client = this.createClient(apiKey, region);

    try {
      const command = new ConverseCommand({
        modelId: config.model,
        messages: [
          {
            role: 'user',
            content: [{ text: 'ping' }],
          },
        ],
        inferenceConfig: {
          temperature: 0,
          maxTokens: 1,
        },
      });

      await client.send(command);
      return true;
    } catch (error) {
      logger.error({ err: error }, `AWS Bedrock health check failed for model ${config.model}:`);
      throw error;
    }
  }
}
