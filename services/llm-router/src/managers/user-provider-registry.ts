import { Config } from '../config/index.js';
import { AliyunProvider } from '../providers/aliyun.js';
import { AnthropicProvider } from '../providers/anthropic.js';
import { AzureOpenAIProvider } from '../providers/azure-openai.js';
import { BaichuanProvider } from '../providers/baichuan.js';
import { BaiduProvider } from '../providers/baidu.js';
import { BaseLLMProvider } from '../providers/base.js';
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
        baseUrl?: string;
        apiKey?: string;
        modelName: string;
      };
      params?: Array<{ param_key: string; value?: string }>;
    }
    const data = (await res.json().catch(() => undefined)) as UserModelResponse | undefined;
    if (!data?.model) return undefined;
    const providerId = (data.model.provider || '').toLowerCase();

    let p: BaseLLMProvider | undefined;
    switch (providerId) {
      case 'openai':
        p = new OpenAIProvider();
        break;
      case 'anthropic':
        p = new AnthropicProvider();
        break;
      case 'azure-openai':
        p = new AzureOpenAIProvider();
        break;
      case 'ollama':
        p = new OllamaProvider();
        break;
      case 'deepseek':
        p = new DeepSeekProvider();
        break;
      case 'kimi':
        p = new KimiProvider();
        break;
      case 'gemini':
        p = new GeminiProvider();
        break;
      case 'qwen':
        p = new QwenProvider();
        break;
      case 'zhipu':
        p = new ZhipuProvider();
        break;
      case 'siliconflow':
        p = new SiliconFlowProvider();
        break;
      case 'tencent':
        p = new TencentProvider();
        break;
      case 'volcengine':
        p = new VolcEngineProvider();
        break;
      case 'vllm':
        p = new VllmProvider();
        break;
      case 'moonshot':
        p = new MoonshotProvider();
        break;
      case 'aws-bedrock':
        p = new BedrockProvider();
        break;
      case 'aliyun-bailian':
        p = new AliyunProvider();
        break;
      case 'tencent-cloud':
        p = new TencentCloudProvider();
        break;
      case 'xf':
        p = new XfProvider();
        break;
      case 'xinference':
        p = new XinferenceProvider();
        break;
      case 'regolo':
        p = new RegoloProvider();
        break;
      case 'baidu':
        p = new BaiduProvider();
        break;
      case 'minimax':
        p = new MiniMaxProvider();
        break;
      case 'stepfun':
        p = new StepFunProvider();
        break;
      case 'sensenova':
        p = new SenseNovaProvider();
        break;
      case 'baichuan':
        p = new BaichuanProvider();
        break;
      default:
        return undefined;
    }
    if (!p.isAvailable()) return undefined;
    this.set(userId, p);
    return p;
  }
}
