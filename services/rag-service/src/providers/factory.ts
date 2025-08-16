import { logger } from '../utils/logger.js';
import { AnthropicEmbeddingProvider } from './anthropic.js';
import { AzureOpenAIEmbeddingProvider } from './azure-openai.js';
import { BaseEmbeddingProvider } from './base.js';
import { DeepSeekEmbeddingProvider } from './deepseek.js';
import { GeminiEmbeddingProvider } from './gemini.js';
import { KimiEmbeddingProvider } from './kimi.js';
import { MockEmbeddingProvider } from './mock.js';
import { MoonshotEmbeddingProvider } from './moonshot.js';
import { OllamaEmbeddingProvider } from './ollama.js';
import { OpenAIEmbeddingProvider } from './openai.js';
import { QwenEmbeddingProvider } from './qwen.js';
import { SiliconFlowEmbeddingProvider } from './siliconflow.js';
import { TencentEmbeddingProvider } from './tencent.js';
import { VllmEmbeddingProvider } from './vllm.js';
import { VolcEngineEmbeddingProvider } from './volcengine.js';
import { ZhipuEmbeddingProvider } from './zhipu.js';

export class EmbeddingProviderFactory {
  static createProvider(providerType: string, config: Record<string, any>): BaseEmbeddingProvider {
    // 将 snake_case 转换为 camelCase
    const normalizedConfig = Object.fromEntries(
      Object.entries(config).map(([key, value]) => [
        key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
        value,
      ]),
    );

    switch (providerType.toLowerCase()) {
      case 'anthropic':
        return new AnthropicEmbeddingProvider(normalizedConfig as any);

      case 'azure-openai':
        return new AzureOpenAIEmbeddingProvider(normalizedConfig as any);

      case 'deepseek':
        return new DeepSeekEmbeddingProvider(normalizedConfig as any);

      case 'gemini':
        return new GeminiEmbeddingProvider(normalizedConfig as any);

      case 'kimi':
        return new KimiEmbeddingProvider(normalizedConfig as any);

      case 'moonshot':
        return new MoonshotEmbeddingProvider(normalizedConfig as any);

      case 'openai':
        return new OpenAIEmbeddingProvider(normalizedConfig as any);

      case 'ollama':
        return new OllamaEmbeddingProvider(normalizedConfig as any);

      case 'qwen':
        return new QwenEmbeddingProvider(normalizedConfig as any);

      case 'siliconflow':
        return new SiliconFlowEmbeddingProvider(normalizedConfig as any);

      case 'tencent':
        return new TencentEmbeddingProvider(normalizedConfig as any);

      case 'vllm':
        return new VllmEmbeddingProvider(normalizedConfig as any);

      case 'volcengine':
        return new VolcEngineEmbeddingProvider(normalizedConfig as any);

      case 'zhipu':
        return new ZhipuEmbeddingProvider(normalizedConfig as any);

      case 'mock':
        return new MockEmbeddingProvider(normalizedConfig as any);

      default:
        logger.warn(`Unknown embedding provider: ${providerType}, falling back to mock`);
        return new MockEmbeddingProvider(normalizedConfig);
    }
  }
}
