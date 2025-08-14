import { Config } from '../config/index.js';
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
    let baseUrl: string | undefined = (data.model as any).base_url;
    let apiKey: string | undefined = (data.model as any).api_key;
    try {
      const credRaw = (data.model as any).credentials;
      const cred = typeof credRaw === 'string' ? JSON.parse(credRaw) : credRaw;
      if (cred && typeof cred === 'object') {
        baseUrl = baseUrl || cred.base_url;
        apiKey = apiKey || cred.api_key;
      }
    } catch {}
    const p = new OpenAICompatibleProvider({
      id: data.model.provider || 'custom',
      baseUrl,
      apiKey,
      model: data.model.model_name,
      temperature: parseFloat(
        (data.params?.find((x) => x.param_key === 'temperature')?.value as string | undefined) ||
          '0.7',
      ),
      maxTokens: parseInt(
        (data.params?.find((x) => x.param_key === 'max_tokens')?.value as string | undefined) ||
          '2000',
      ),
    });
    if (!p.isAvailable()) return undefined;
    this.set(userId, p);
    return p;
  }
}
