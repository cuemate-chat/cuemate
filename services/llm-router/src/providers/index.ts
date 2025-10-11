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

// 这个函数现在已经不再使用，因为我们改为在 LLMManager 中直接注册所有 providers
// 保留这个函数以避免编译错误，但现在返回空的 Map
export async function initializeProviders(
  _config: Config = config,
): Promise<Map<string, BaseLLMProvider>> {
  const providers = new Map<string, BaseLLMProvider>();

  // 新架构中，所有 providers 都在启动时注册，不再需要这个初始化函数
  // 只需要返回空的 Map 以保持兼容性
  
  try {
    // 注册所有 providers，但不需要配置，因为它们现在使用 RuntimeConfig
    const allProviders = [
      new DeepSeekProvider(),
      new OllamaProvider(),
      new AzureOpenAIProvider(),
      new ZhipuProvider(),
      new AnthropicProvider(),
      new GeminiProvider(),
      new KimiProvider(),
      new VolcEngineProvider(),
      new TencentProvider(),
      new SiliconFlowProvider(),
      new VllmProvider(),
    ];
    
    // 将所有 providers 添加到 Map 中
    allProviders.forEach(provider => {
      providers.set(provider.getName(), provider);
    });
    
    // 处理动态 providers
    if (Array.isArray((config as any).providers.dynamic)) {
      for (const d of (config as any).providers.dynamic) {
        try {
          const p = new OpenAICompatibleProvider(d.id || d.provider || 'custom');
          providers.set(p.getName(), p);
          logger.info(`Dynamic provider initialized: ${p.getName()}`);
        } catch (e) {
          logger.warn('Failed to init dynamic provider', e);
        }
      }
    }
    
    logger.info(`Initialized ${providers.size} providers: ${Array.from(providers.keys()).join(', ')}`);
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize providers:');
  }

  return providers;
}
