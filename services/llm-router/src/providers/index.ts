import { Config } from '../config/index.js';
import { BaseLLMProvider } from './base.js';
import { OpenAIProvider } from './openai.js';
import { MoonshotProvider } from './moonshot.js';
import { logger } from '../utils/logger.js';

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

  // TODO: Add GLM and Qwen providers

  if (providers.size === 0) {
    logger.warn('No LLM providers configured');
  }

  return providers;
}
