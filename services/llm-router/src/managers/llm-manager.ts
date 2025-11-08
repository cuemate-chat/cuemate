import { EventEmitter } from 'events';
import PQueue from 'p-queue';
import { Config } from '../config/index.js';
import { AliyunProvider } from '../providers/aliyun.js';
import { AnthropicProvider } from '../providers/anthropic.js';
import { AzureOpenAIProvider } from '../providers/azure-openai.js';
import { BaichuanProvider } from '../providers/baichuan.js';
import { BaiduProvider } from '../providers/baidu.js';
import {
  BaseLLMProvider,
  CompletionRequest,
  CompletionResponse,
  RuntimeConfig,
} from '../providers/base.js';
import { BedrockProvider } from '../providers/bedrock.js';
import { DeepSeekProvider } from '../providers/deepseek.js';
import { GeminiProvider } from '../providers/gemini.js';
import { KimiProvider } from '../providers/kimi.js';
import { MiniMaxProvider } from '../providers/minimax.js';
import { MoonshotProvider } from '../providers/moonshot.js';
import { OllamaProvider } from '../providers/ollama.js';
import { OpenAIProvider } from '../providers/openai.js';
import { QwenProvider } from '../providers/qwen.js';
import { RegoloProvider } from '../providers/regolo.js';
import { SenseNovaProvider } from '../providers/sensenova.js';
import { SiliconFlowProvider } from '../providers/siliconflow.js';
import { StepFunProvider } from '../providers/stepfun.js';
import { TencentCloudProvider } from '../providers/tencent-cloud.js';
import { TencentProvider } from '../providers/tencent.js';
import { VllmProvider } from '../providers/vllm.js';
import { VolcEngineProvider } from '../providers/volcengine.js';
import { XfProvider } from '../providers/xf.js';
import { XinferenceProvider } from '../providers/xinference.js';
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
    providers.set('bedrock', new BedrockProvider());
    providers.set('aliyun-bailian', new AliyunProvider());
    providers.set('tencent-cloud', new TencentCloudProvider());
    providers.set('xf', new XfProvider());
    providers.set('xinference', new XinferenceProvider());
    providers.set('regolo', new RegoloProvider());
    providers.set('baidu', new BaiduProvider());
    providers.set('minimax', new MiniMaxProvider());
    providers.set('stepfun', new StepFunProvider());
    providers.set('sensenova', new SenseNovaProvider());
    providers.set('baichuan', new BaichuanProvider());

    logger.info(
      `Registered ${providers.size} providers: ${Array.from(providers.keys()).join(', ')}`,
    );

    return providers;
  }

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
      logger.error({ err: error }, `Stream failed for ${runtimeConfig.provider}:`);
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
