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
    // 解析 credentials（兼容历史字段）
    const parseCredentials = (raw: any): Record<string, any> => {
      try {
        const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (obj && typeof obj === 'object') return obj as Record<string, any>;
      } catch {}
      return {};
    };

    const credentials = parseCredentials((data.model as any).credentials);
    const baseUrl: string | undefined =
      (data.model as any).base_url || (credentials.base_url as string | undefined);
    const apiKey: string | undefined =
      (data.model as any).api_key || (credentials.api_key as string | undefined);
    const providerId = (data.model.provider || 'custom').toLowerCase();
    const temperature = parseFloat(
      (data.params?.find((x) => x.param_key === 'temperature')?.value as string | undefined) ||
        '0.7',
    );
    const maxTokens = parseInt(
      (data.params?.find((x) => x.param_key === 'max_tokens')?.value as string | undefined) ||
        '2000',
    );

    let p: BaseLLMProvider | undefined;
    switch (providerId) {
      case 'azure-openai': {
        const endpoint = baseUrl || credentials.endpoint || credentials.baseUrl;
        const deployment = credentials.deployment_name || data.model.model_name;
        const apiVersion = credentials.api_version;
        // v1 SDK 允许自定义 baseURL，必要时可把 api-version 放入查询参数
        const finalBase = endpoint
          ? `${String(endpoint).replace(/\/$/, '')}/openai/deployments/${deployment}${
              apiVersion ? `?api-version=${apiVersion}` : ''
            }`
          : undefined;
        p = new AzureOpenAIProvider({
          baseUrl: finalBase || '',
          apiKey: apiKey || '',
          model: deployment,
          temperature,
          maxTokens,
        }) as unknown as BaseLLMProvider;
        break;
      }
      default: {
        p = new OpenAICompatibleProvider({
          id: providerId,
          baseUrl,
          apiKey,
          model: data.model.model_name,
          temperature,
          maxTokens,
        }) as unknown as BaseLLMProvider;
      }
    }
    if (!p.isAvailable()) return undefined;
    this.set(userId, p);
    return p;
  }
}
