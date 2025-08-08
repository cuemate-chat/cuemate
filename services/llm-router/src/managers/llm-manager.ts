import { EventEmitter } from 'events';
import PQueue from 'p-queue';
import { logger } from '../utils/logger.js';
import { Config } from '../config/index.js';
import { BaseLLMProvider, CompletionRequest, CompletionResponse } from '../providers/base.js';

export interface ProviderStatus {
  id: string;
  available: boolean;
  latency?: number;
  errorRate?: number;
  lastError?: string;
  lastChecked: number;
}

export class LLMManager extends EventEmitter {
  private providers: Map<string, BaseLLMProvider>;
  private config: Config;
  // 保留队列以备未来限流使用
  private queue: PQueue;
  private providerStatus: Map<string, ProviderStatus>;
  private requestCount: Map<string, number>;

  constructor(providers: Map<string, BaseLLMProvider>, config: Config) {
    super();
    this.providers = providers;
    this.config = config;
    this.queue = new PQueue({ concurrency: 10 });
    this.providerStatus = new Map();
    this.requestCount = new Map();

    // 初始化提供者状态
    this.initializeProviderStatus();
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

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const strategy = this.config.routing.strategy;
    
    switch (strategy) {
      case 'primary-fallback':
        return this.primaryFallbackStrategy(request);
      case 'load-balance':
        return this.loadBalanceStrategy(request);
      case 'fastest':
        return this.fastestStrategy(request);
      default:
        return this.primaryFallbackStrategy(request);
    }
  }

  private async primaryFallbackStrategy(request: CompletionRequest): Promise<CompletionResponse> {
    const primaryId = this.config.routing.primaryProvider;
    const fallbackIds = this.config.routing.fallbackProviders;

    // 尝试主提供者
    const primaryProvider = this.providers.get(primaryId);
    if (primaryProvider?.isAvailable()) {
      try {
        return await this.executeWithTimeout(primaryProvider, request, primaryId);
      } catch (error) {
        logger.error(`Primary provider ${primaryId} failed:`, error);
        this.updateProviderStatus(primaryId, false, error);
      }
    }

    // 尝试备用提供者
    for (const fallbackId of fallbackIds) {
      const fallbackProvider = this.providers.get(fallbackId);
      if (fallbackProvider?.isAvailable()) {
        try {
          logger.info(`Falling back to ${fallbackId}`);
          return await this.executeWithTimeout(fallbackProvider, request, fallbackId);
        } catch (error) {
          logger.error(`Fallback provider ${fallbackId} failed:`, error);
          this.updateProviderStatus(fallbackId, false, error);
        }
      }
    }

    throw new Error('All LLM providers failed');
  }

  private async loadBalanceStrategy(request: CompletionRequest): Promise<CompletionResponse> {
    // 选择请求最少的可用提供者
    const availableProviders = Array.from(this.providers.entries())
      .filter(([_, provider]) => provider.isAvailable())
      .sort((a, b) => {
        const countA = this.requestCount.get(a[0]) || 0;
        const countB = this.requestCount.get(b[0]) || 0;
        return countA - countB;
      });

    if (availableProviders.length === 0) {
      throw new Error('No available LLM providers');
    }

    const [providerId, provider] = availableProviders[0];
    
    try {
      this.requestCount.set(providerId, (this.requestCount.get(providerId) || 0) + 1);
      return await this.executeWithTimeout(provider, request, providerId);
    } catch (error) {
      logger.error(`Provider ${providerId} failed:`, error);
      this.updateProviderStatus(providerId, false, error);
      throw error;
    } finally {
      this.requestCount.set(providerId, (this.requestCount.get(providerId) || 0) - 1);
    }
  }

  private async fastestStrategy(request: CompletionRequest): Promise<CompletionResponse> {
    // 并行请求多个提供者，返回最快的响应
    const availableProviders = Array.from(this.providers.entries())
      .filter(([_, provider]) => provider.isAvailable())
      .slice(0, 3); // 最多并行3个

    if (availableProviders.length === 0) {
      throw new Error('No available LLM providers');
    }

    const promises = availableProviders.map(([id, provider]) =>
      this.executeWithTimeout(provider, request, id)
        .then(response => ({ success: true, response, providerId: id }))
        .catch(error => ({ success: false, error, providerId: id }))
    );

    const results = await Promise.race(promises);
    
    if ('response' in results && results.success) {
      logger.info(`Fastest provider: ${results.providerId}`);
      return results.response;
    }

    throw new Error('All LLM providers failed in race');
  }

  private async executeWithTimeout(
    provider: BaseLLMProvider,
    request: CompletionRequest,
    providerId: string
  ): Promise<CompletionResponse> {
    const startTime = Date.now();
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), this.config.routing.timeout);
    });

    try {
      const response = await Promise.race([
        provider.complete(request),
        timeoutPromise,
      ]);

      const latency = Date.now() - startTime;
      this.updateProviderStatus(providerId, true, null, latency);
      
      return response;
    } catch (error) {
      throw error;
    }
  }

  async stream(request: CompletionRequest): Promise<AsyncGenerator<string>> {
    const primaryId = this.config.routing.primaryProvider;
    const primaryProvider = this.providers.get(primaryId);

    if (!primaryProvider?.isAvailable()) {
      throw new Error(`Provider ${primaryId} not available`);
    }

    try {
      const s = await primaryProvider.stream(request);
      if (Symbol.asyncIterator in (s as any)) {
        return s as AsyncGenerator<string>;
      }
      return s as AsyncGenerator<string>;
    } catch (error) {
      logger.error(`Stream failed for ${primaryId}:`, error);
      throw error;
    }
  }

  private updateProviderStatus(
    providerId: string,
    success: boolean,
    error: any = null,
    latency?: number
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

    for (const [id, provider] of this.providers) {
      try {
        const isHealthy = await provider.healthCheck();
        results.set(id, isHealthy);
        this.updateProviderStatus(id, isHealthy);
      } catch (error) {
        results.set(id, false);
        this.updateProviderStatus(id, false, error);
      }
    }

    return results;
  }
}
