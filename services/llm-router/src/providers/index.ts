import { Config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { AnthropicProvider } from './anthropic.js';
import { AzureOpenAIProvider } from './azure-openai.js';
import { BaseLLMProvider } from './base.js';
import { DeepSeekProvider } from './deepseek.js';
import { GeminiProvider } from './gemini.js';
import { KimiProvider } from './kimi.js';
import { MoonshotProvider } from './moonshot.js';
import { OllamaProvider } from './ollama.js';
import { OpenAICompatibleProvider } from './openai-compatible.js';
import { OpenAIProvider } from './openai.js';
import { QwenProvider } from './qwen.js';
import { SiliconFlowProvider } from './siliconflow.js';
import { TencentProvider } from './tencent.js';
import { VllmProvider } from './vllm.js';
import { VolcEngineProvider } from './volcengine.js';
import { ZhipuProvider } from './zhipu.js';

export async function initializeProviders(config: Config): Promise<Map<string, BaseLLMProvider>> {
  const providers = new Map<string, BaseLLMProvider>();

  // OpenAI
  if (config.providers.openai.apiKey) {
    const openai = new OpenAIProvider(config.providers.openai);
    providers.set('openai', openai as BaseLLMProvider);
    logger.info('OpenAI provider initialized');
  }

  // Moonshot
  if (config.providers.moonshot.apiKey) {
    const moonshot = new MoonshotProvider(config.providers.moonshot);
    providers.set('moonshot', moonshot as BaseLLMProvider);
    logger.info('Moonshot provider initialized');
  }

  // 常见厂商（如设置了环境变量则直接启用，便于本地调试；生产以数据库动态为主）
  try {
    if (process.env.DEEPSEEK_API_KEY) {
      const p = new DeepSeekProvider({
        apiKey: process.env.DEEPSEEK_API_KEY,
        model: process.env.DEEPSEEK_MODEL || 'deepseek-reasoner',
      });
      if (p.isAvailable()) providers.set('deepseek', p as unknown as BaseLLMProvider);
    }
  } catch {}
  try {
    if (process.env.OLLAMA_BASE_URL) {
      const p = new OllamaProvider({
        baseUrl: process.env.OLLAMA_BASE_URL,
        model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
      });
      if (p.isAvailable()) providers.set('ollama', p as unknown as BaseLLMProvider);
    }
  } catch {}
  try {
    if (process.env.AZURE_OPENAI_BASE_URL && process.env.AZURE_OPENAI_API_KEY) {
      const p = new AzureOpenAIProvider({
        baseUrl: process.env.AZURE_OPENAI_BASE_URL,
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        model: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini',
      });
      if (p.isAvailable()) providers.set('azure-openai', p as unknown as BaseLLMProvider);
    }
  } catch {}
  try {
    if (process.env.QWEN_API_KEY) {
      const p = new QwenProvider({
        apiKey: process.env.QWEN_API_KEY,
        model: process.env.QWEN_MODEL || 'qwen-max',
      });
      if (p.isAvailable()) providers.set('qwen', p as unknown as BaseLLMProvider);
    }
  } catch {}
  try {
    if (process.env.ZHIPU_API_KEY) {
      const p = new ZhipuProvider({
        apiKey: process.env.ZHIPU_API_KEY,
        model: process.env.ZHIPU_MODEL || 'glm-4',
      });
      if (p.isAvailable()) providers.set('zhipu', p as unknown as BaseLLMProvider);
    }
  } catch {}
  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const p = new AnthropicProvider({
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.ANTHROPIC_MODEL || 'claude-3-7-sonnet',
      });
      if (p.isAvailable()) providers.set('anthropic', p as unknown as BaseLLMProvider);
    }
  } catch {}
  try {
    if (process.env.GEMINI_API_KEY) {
      const p = new GeminiProvider({
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
      });
      if (p.isAvailable()) providers.set('gemini', p as unknown as BaseLLMProvider);
    }
  } catch {}
  try {
    if (process.env.KIMI_API_KEY) {
      const p = new KimiProvider({
        apiKey: process.env.KIMI_API_KEY,
        model: process.env.KIMI_MODEL || 'moonshot-v1-32k',
      });
      if (p.isAvailable()) providers.set('kimi', p as unknown as BaseLLMProvider);
    }
  } catch {}
  try {
    if (process.env.VOLC_API_KEY) {
      const p = new VolcEngineProvider({
        apiKey: process.env.VOLC_API_KEY,
        model: process.env.VOLC_MODEL || 'doubao-pro-32k',
      });
      if (p.isAvailable()) providers.set('volcengine', p as unknown as BaseLLMProvider);
    }
  } catch {}
  try {
    if (process.env.TENCENT_API_KEY) {
      const p = new TencentProvider({
        apiKey: process.env.TENCENT_API_KEY,
        model: process.env.TENCENT_MODEL || 'hunyuan-pro',
      });
      if (p.isAvailable()) providers.set('tencent', p as unknown as BaseLLMProvider);
    }
  } catch {}
  try {
    if (process.env.SILICONFLOW_API_KEY) {
      const p = new SiliconFlowProvider({
        apiKey: process.env.SILICONFLOW_API_KEY,
        model: process.env.SILICONFLOW_MODEL || 'llama3.1-8b-instruct',
      });
      if (p.isAvailable()) providers.set('siliconflow', p as unknown as BaseLLMProvider);
    }
  } catch {}
  try {
    if (process.env.VLLM_BASE_URL) {
      const p = new VllmProvider({
        baseUrl: process.env.VLLM_BASE_URL,
        model: process.env.VLLM_MODEL || 'llama3.1:8b',
      });
      if (p.isAvailable()) providers.set('vllm', p as unknown as BaseLLMProvider);
    }
  } catch {}

  // 预留：从 web-api 注入的动态模型，可在运行期扩展
  if (Array.isArray((config as any).providers.dynamic)) {
    for (const d of (config as any).providers.dynamic) {
      try {
        const p = new OpenAICompatibleProvider({
          id: d.id || d.provider || 'custom',
          baseUrl: d.base_url || d.baseUrl,
          apiKey: d.api_key || d.apiKey,
          model: d.model_name || d.model,
          temperature: Number(d.temperature ?? d.params?.temperature ?? 0.7),
          maxTokens: Number(d.max_tokens ?? d.params?.max_tokens ?? 2000),
        });
        if (p.isAvailable()) {
          providers.set(p.getName(), p as BaseLLMProvider);
          logger.info(`Dynamic provider initialized: ${p.getName()}`);
        }
      } catch (e) {
        logger.warn('Failed to init dynamic provider', e);
      }
    }
  }

  if (providers.size === 0) {
    logger.warn('No LLM providers configured');
  }

  return providers;
}
