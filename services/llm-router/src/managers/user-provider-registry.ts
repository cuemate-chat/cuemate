import { Config } from '../config/index.js';
import { AzureOpenAIProvider } from '../providers/azure-openai.js';
import { BaseLLMProvider } from '../providers/base.js';
import { OpenAICompatibleProvider } from '../providers/openai-compatible.js';

interface CachedItem {
  provider: BaseLLMProvider;
  expiresAt: number;
}

export class UserProviderRegistry {
  private cache = new Map<string, CachedItem>();
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  get(userId: string): BaseLLMProvider | undefined {
    const it = this.cache.get(userId);
    if (!it) return undefined;
    if (Date.now() > it.expiresAt) {
      this.cache.delete(userId);
      return undefined;
    }
    return it.provider;
  }

  set(userId: string, provider: BaseLLMProvider) {
    const ttl = this.config.webApiInternal.cacheTtlMs;
    this.cache.set(userId, { provider, expiresAt: Date.now() + ttl });
  }

  async loadFromWebApi(userId: string): Promise<BaseLLMProvider | undefined> {
    const { baseUrl: webApiBaseUrl, serviceKey } = this.config.webApiInternal;
    const url = `${webApiBaseUrl}/internal/models/by-user?userId=${encodeURIComponent(userId)}`;
    const res = await fetch(url, { headers: { 'x-service-key': serviceKey || '' } as any });
    if (!res.ok) return undefined;
    interface UserModelResponse {
      model?: {
        provider?: string;
        credentials?: any;
        base_url?: string;
        api_key?: string;
        model_name: string;
      };
      params?: Array<{ param_key: string; value?: string }>;
    }
    const data = (await res.json().catch(() => undefined)) as UserModelResponse | undefined;
    if (!data?.model) return undefined;
    // parseCredentials 函数现在不再需要，因为使用 RuntimeConfig
    // const parseCredentials = (raw: any): Record<string, any> => {
    //   try {
    //     const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
    //     if (obj && typeof obj === 'object') return obj as Record<string, any>;
    //   } catch {}
    //   return {};
    // };

    // 现在使用 RuntimeConfig，不再需要在构造时传递这些参数
    const providerId = (data.model.provider || 'custom').toLowerCase();

    let p: BaseLLMProvider | undefined;
    switch (providerId) {
      case 'azure-openai': {
        p = new AzureOpenAIProvider() as unknown as BaseLLMProvider;
        break;
      }
      default: {
        p = new OpenAICompatibleProvider(providerId) as unknown as BaseLLMProvider;
      }
    }
    if (!p.isAvailable()) return undefined;
    this.set(userId, p);
    return p;
  }
}
