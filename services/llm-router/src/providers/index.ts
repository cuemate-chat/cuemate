import { config, type Config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { AnthropicProvider } from './anthropic.js';
import { AzureOpenAIProvider } from './azure-openai.js';
import { BaseLLMProvider } from './base.js';
import { DeepSeekProvider } from './deepseek.js';
import { GeminiProvider } from './gemini.js';
import { KimiProvider } from './kimi.js';
import { OllamaProvider } from './ollama.js';
import { OpenAICompatibleProvider } from './openai-compatible.js';
import { SiliconFlowProvider } from './siliconflow.js';
import { TencentProvider } from './tencent.js';
import { VllmProvider } from './vllm.js';
import { VolcEngineProvider } from './volcengine.js';
import { ZhipuProvider } from './zhipu.js';

export async function initializeProviders(
  _config: Config = config,
): Promise<Map<string, BaseLLMProvider>> {
  const providers = new Map<string, BaseLLMProvider>();

  try {
    if (_config.providers.deepseek.apiKey) {
      const p = new DeepSeekProvider({
        apiKey: _config.providers.deepseek.apiKey,
        model: _config.providers.deepseek.model,
      });
      if (p.isAvailable()) providers.set('deepseek', p as unknown as BaseLLMProvider);
    }
  } catch {}
  try {
    if (_config.providers.ollama.baseUrl) {
      const p = new OllamaProvider({
        baseUrl: _config.providers.ollama.baseUrl,
        model: _config.providers.ollama.model,
      });
      if (p.isAvailable()) providers.set('ollama', p as unknown as BaseLLMProvider);
    }
  } catch {}
  try {
    if (_config.providers.azureOpenai.baseUrl && _config.providers.azureOpenai.apiKey) {
      const p = new AzureOpenAIProvider({
        baseUrl: _config.providers.azureOpenai.baseUrl,
        apiKey: _config.providers.azureOpenai.apiKey,
        model: _config.providers.azureOpenai.model,
      });
      if (p.isAvailable()) providers.set('azure-openai', p as unknown as BaseLLMProvider);
    }
  } catch {}

  try {
    if (_config.providers.zhipu.apiKey) {
      const p = new ZhipuProvider({
        apiKey: _config.providers.zhipu.apiKey,
        model: _config.providers.zhipu.model,
      });
      if (p.isAvailable()) providers.set('zhipu', p as unknown as BaseLLMProvider);
    }
  } catch {}
  try {
    if (_config.providers.anthropic.apiKey) {
      const p = new AnthropicProvider({
        apiKey: _config.providers.anthropic.apiKey,
        model: _config.providers.anthropic.model,
      });
      if (p.isAvailable()) providers.set('anthropic', p as unknown as BaseLLMProvider);
    }
  } catch {}
  try {
    if (_config.providers.gemini.apiKey) {
      const p = new GeminiProvider({
        apiKey: _config.providers.gemini.apiKey,
        model: _config.providers.gemini.model,
      });
      if (p.isAvailable()) providers.set('gemini', p as unknown as BaseLLMProvider);
    }
  } catch {}
  try {
    if (_config.providers.kimi.apiKey) {
      const p = new KimiProvider({
        apiKey: _config.providers.kimi.apiKey,
        model: _config.providers.kimi.model,
      });
      if (p.isAvailable()) providers.set('kimi', p as unknown as BaseLLMProvider);
    }
  } catch {}
  try {
    if (_config.providers.volcengine.apiKey) {
      const p = new VolcEngineProvider({
        apiKey: _config.providers.volcengine.apiKey,
        model: _config.providers.volcengine.model,
      });
      if (p.isAvailable()) providers.set('volcengine', p as unknown as BaseLLMProvider);
    }
  } catch {}
  try {
    if (_config.providers.tencent.apiKey) {
      const p = new TencentProvider({
        apiKey: _config.providers.tencent.apiKey,
        model: _config.providers.tencent.model,
      });
      if (p.isAvailable()) providers.set('tencent', p as unknown as BaseLLMProvider);
    }
  } catch {}
  try {
    if (_config.providers.siliconflow.apiKey) {
      const p = new SiliconFlowProvider({
        apiKey: _config.providers.siliconflow.apiKey,
        model: _config.providers.siliconflow.model,
      });
      if (p.isAvailable()) providers.set('siliconflow', p as unknown as BaseLLMProvider);
    }
  } catch {}
  try {
    if (_config.providers.vllm.baseUrl) {
      const p = new VllmProvider({
        baseUrl: _config.providers.vllm.baseUrl,
        model: _config.providers.vllm.model,
      });
      if (p.isAvailable()) providers.set('vllm', p as unknown as BaseLLMProvider);
    }
  } catch {}

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
