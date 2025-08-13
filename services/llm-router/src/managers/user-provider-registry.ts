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
    const { baseUrl, serviceKey } = this.config.webApiInternal;
    const url = `${baseUrl}/internal/models/by-user?userId=${encodeURIComponent(userId)}`;
    const res = await fetch(url, { headers: { 'x-service-key': serviceKey || '' } as any });
    if (!res.ok) return undefined;
    interface UserModelResponse {
      model?: { provider?: string; base_url?: string; api_key?: string; model_name: string };
      params?: Array<{ param_key: string; value?: string }>;
    }
    const data = (await res.json().catch(() => undefined)) as UserModelResponse | undefined;
    if (!data?.model) return undefined;
    // 先按 OpenAI 兼容构造；未来可根据 provider 字段切换具体 Provider 类
    const p = new OpenAICompatibleProvider({
      id: data.model.provider || 'custom',
      baseUrl: data.model.base_url,
      apiKey: data.model.api_key,
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
