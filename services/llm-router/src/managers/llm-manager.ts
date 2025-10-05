import { EventEmitter } from 'events';
import PQueue from 'p-queue';
import { Config } from '../config/index.js';
import { AnthropicProvider } from '../providers/anthropic.js';
import { AzureOpenAIProvider } from '../providers/azure-openai.js';
import {
  BaseLLMProvider,
  CompletionRequest,
  CompletionResponse,
  RuntimeConfig,
} from '../providers/base.js';
import { DeepSeekProvider } from '../providers/deepseek.js';
import { GeminiProvider } from '../providers/gemini.js';
import { KimiProvider } from '../providers/kimi.js';
import { MoonshotProvider } from '../providers/moonshot.js';
import { OllamaProvider } from '../providers/ollama.js';
import { OpenAICompatibleProvider } from '../providers/openai-compatible.js';
import { OpenAIProvider } from '../providers/openai.js';
import { QwenProvider } from '../providers/qwen.js';
import { SiliconFlowProvider } from '../providers/siliconflow.js';
import { TencentProvider } from '../providers/tencent.js';
import { VllmProvider } from '../providers/vllm.js';
import { VolcEngineProvider } from '../providers/volcengine.js';
import { ZhipuProvider } from '../providers/zhipu.js';
import { logger } from '../utils/logger.js';
// import { UserProviderRegistry } from './user-provider-registry.js';

export interface ProviderStatus {
  id: string;
  available: boolean;
  latency?: number;
  errorRate?: number;
  lastError?: string;
  lastChecked: number;
}

// DynamicProviderConfig 已移除，现在使用 RuntimeConfig

export class LLMManager extends EventEmitter {
  private providers: Map<string, BaseLLMProvider>;
  private config: Config;
  // 保留队列以备未来限流使用
  private queue: PQueue;
  private providerStatus: Map<string, ProviderStatus>;
  private requestCount: Map<string, number>;
  // private userRegistry: UserProviderRegistry;
  // 已移除动态 providers 缓存，现在使用统一的注册机制

  constructor(config: Config) {
    super();
    this.config = config;
    this.queue = new PQueue({ concurrency: 10 });
    this.providerStatus = new Map();
    this.requestCount = new Map();
    // this.userRegistry = new UserProviderRegistry(config);

    // 自动注册所有 providers（启动时不需要配置）
    this.providers = this.initializeAllProviders();

    // 初始化提供者状态
    this.initializeProviderStatus();
  }

  private initializeAllProviders(): Map<string, BaseLLMProvider> {
    const providers = new Map<string, BaseLLMProvider>();

    // 注册所有 providers（使用新架构）
    providers.set('openai', new OpenAIProvider());
    providers.set('deepseek', new DeepSeekProvider());
    providers.set('openai-compatible', new OpenAICompatibleProvider());
    providers.set('anthropic', new AnthropicProvider());
    providers.set('azure-openai', new AzureOpenAIProvider());
    providers.set('gemini', new GeminiProvider());
    providers.set('kimi', new KimiProvider());
    providers.set('moonshot', new MoonshotProvider());
    providers.set('ollama', new OllamaProvider());
    providers.set('qwen', new QwenProvider());
    providers.set('siliconflow', new SiliconFlowProvider());
    providers.set('tencent', new TencentProvider());
    providers.set('vllm', new VllmProvider());
    providers.set('volcengine', new VolcEngineProvider());
    providers.set('zhipu', new ZhipuProvider());

    logger.info(
      `Registered ${providers.size} providers: ${Array.from(providers.keys()).join(', ')}`,
    );

    return providers;
  }

  // 为"按用户绑定模型"预留：某些请求会携带 metadata.userId，根据 userId 动态选择 provider
  // private async getProviderForUser(userId?: string): Promise<BaseLLMProvider | null> {
  //   if (!userId) return null;
  //   const cached = this.userRegistry.get(userId);
  //   if (cached) return cached;
  //   try {
  //     const p = await this.userRegistry.loadFromWebApi(userId);
  //     return p || null;
  //   } catch (e) {
  //     logger.warn('load user provider failed', e as any);
  //     return null;
  //   }
  // }

  private initializeProviderStatus() {
    for (const [id, provider] of this.providers) {
      this.providerStatus.set(id, {
        id,
        available: provider.isAvailable(),
        lastChecked: Date.now(),
      });
      this.requestCount.set(id, 0);
    }
  }

  async complete(
    request: CompletionRequest,
    runtimeConfig: RuntimeConfig,
  ): Promise<CompletionResponse> {
    // 根据 runtimeConfig.provider 选择对应的 provider
    const provider = this.providers.get(runtimeConfig.provider);
    if (!provider) {
      throw new Error(
        `Provider ${runtimeConfig.provider} not found. Available providers: ${Array.from(this.providers.keys()).join(', ')}`,
      );
    }

    return this.executeWithTimeout(provider, request, runtimeConfig);
  }

  // 旧的策略方法已删除，现在直接使用 provider

  private async executeWithTimeout(
    provider: BaseLLMProvider,
    request: CompletionRequest,
    runtimeConfig: RuntimeConfig,
  ): Promise<CompletionResponse> {
    const startTime = Date.now();

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), this.config.routing.timeout);
    });

    try {
      const raced = await Promise.race<CompletionResponse | never>([
        this.queue.add(() =>
          provider.complete(request, runtimeConfig),
        ) as Promise<CompletionResponse>,
        timeoutPromise,
      ]);

      const latency = Date.now() - startTime;
      this.updateProviderStatus(runtimeConfig.provider, true, null, latency);

      return raced as CompletionResponse;
    } catch (error) {
      this.updateProviderStatus(runtimeConfig.provider, false, error);
      throw error;
    }
  }

  async stream(
    request: CompletionRequest,
    runtimeConfig: RuntimeConfig,
  ): Promise<AsyncGenerator<string>> {
    const provider = this.providers.get(runtimeConfig.provider);
    if (!provider) {
      throw new Error(`Provider ${runtimeConfig.provider} not found`);
    }

    try {
      return await provider.stream(request, runtimeConfig);
    } catch (error) {
      logger.error(`Stream failed for ${runtimeConfig.provider}:`, error);
      throw error;
    }
  }

  private updateProviderStatus(
    providerId: string,
    success: boolean,
    error: any = null,
    latency?: number,
  ) {
    const status = this.providerStatus.get(providerId) || {
      id: providerId,
      available: true,
      lastChecked: Date.now(),
    };

    if (success) {
      status.available = true;
      status.latency = latency;
      status.lastError = undefined;
    } else {
      status.available = false;
      status.lastError = error?.message || 'Unknown error';
    }

    status.lastChecked = Date.now();
    this.providerStatus.set(providerId, status);
  }

  async getProviderStatus(): Promise<ProviderStatus[]> {
    return Array.from(this.providerStatus.values());
  }

  async healthCheck(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const [id] of this.providers) {
      results.set(id, true);
    }

    return results;
  }
}
