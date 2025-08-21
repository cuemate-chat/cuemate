import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  server: z.object({
    port: z.number().default(3002),
    host: z.string().default('0.0.0.0'),
  }),
  cors: z.object({
    origin: z.union([z.string(), z.array(z.string())]).default('*'),
  }),
  rateLimit: z.object({
    max: z.number().default(100),
    windowMs: z.string().default('1 minute'),
  }),
  providers: z.object({
    anthropic: z
      .object({ apiKey: z.string().optional(), model: z.string().default('claude-3-7-sonnet') })
      .default({}),
    azureOpenai: z
      .object({
        baseUrl: z.string().optional(),
        apiKey: z.string().optional(),
        model: z.string().default('gpt-4o-mini'),
      })
      .default({}),
    deepseek: z
      .object({ apiKey: z.string().optional(), model: z.string().default('deepseek-reasoner') })
      .default({}),
    gemini: z
      .object({ apiKey: z.string().optional(), model: z.string().default('gemini-2.0-flash-exp') })
      .default({}),
    kimi: z
      .object({ apiKey: z.string().optional(), model: z.string().default('moonshot-v1-32k') })
      .default({}),
    volcengine: z
      .object({ apiKey: z.string().optional(), model: z.string().default('doubao-pro-32k') })
      .default({}),
    tencent: z
      .object({ apiKey: z.string().optional(), model: z.string().default('hunyuan-pro') })
      .default({}),
    siliconflow: z
      .object({ apiKey: z.string().optional(), model: z.string().default('llama3.1-8b-instruct') })
      .default({}),
    vllm: z
      .object({ baseUrl: z.string().optional(), model: z.string().default('llama3.1:8b') })
      .default({}),
    zhipu: z
      .object({ apiKey: z.string().optional(), model: z.string().default('glm-4') })
      .default({}),
    ollama: z
      .object({ baseUrl: z.string().optional(), model: z.string().default('llama3.1:8b') })
      .default({}),
  }),
  webApiInternal: z.object({
    baseUrl: z.string().default('http://localhost:3004'),
    serviceKey: z.string().optional(),
    cacheTtlMs: z.number().default(5 * 60 * 1000),
  }),
  routing: z.object({
    strategy: z.enum(['primary-fallback', 'load-balance', 'fastest']).default('primary-fallback'),
    primaryProvider: z.string().default('openai'),
    fallbackProviders: z.array(z.string()).default(['moonshot', 'glm', 'qwen']),
    timeout: z.number().default(30000), // 30 seconds
    retryAttempts: z.number().default(2),
    retryDelay: z.number().default(1000),
  }),
  cache: z.object({
    enabled: z.boolean().default(true),
    ttl: z.number().default(3600), // 1 hour
    maxSize: z.number().default(100), // MB
  }),
  prompts: z.object({
    systemPrompt: z.string().default('你是一个专业的面试助手，帮助用户准备和应对各种面试问题。'),
    maxContextLength: z.number().default(4000),
    responseFormats: z.object({
      concise: z.string().default('用一句话简洁回答'),
      points: z.string().default('列出3-5个要点'),
      detailed: z.string().default('提供详细的回答'),
    }),
  }),
});

export const config = configSchema.parse({
  server: {
    port: parseInt(process.env.LLM_PORT || '3002'),
    host: process.env.LLM_HOST || '0.0.0.0',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    windowMs: process.env.RATE_LIMIT_WINDOW || '1 minute',
  },
  providers: {
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL || 'claude-3-7-sonnet',
    },
    azureOpenai: {
      baseUrl: process.env.AZURE_OPENAI_BASE_URL,
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      model: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini',
    },
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: process.env.DEEPSEEK_MODEL || 'deepseek-reasoner',
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
    },
    kimi: {
      apiKey: process.env.KIMI_API_KEY,
      model: process.env.KIMI_MODEL || 'moonshot-v1-32k',
    },
    volcengine: {
      apiKey: process.env.VOLC_API_KEY,
      model: process.env.VOLC_MODEL || 'doubao-pro-32k',
    },
    tencent: {
      apiKey: process.env.TENCENT_API_KEY,
      model: process.env.TENCENT_MODEL || 'hunyuan-pro',
    },
    siliconflow: {
      apiKey: process.env.SILICONFLOW_API_KEY,
      model: process.env.SILICONFLOW_MODEL || 'llama3.1-8b-instruct',
    },
    vllm: {
      baseUrl: process.env.VLLM_BASE_URL,
      model: process.env.VLLM_MODEL || 'llama3.1:8b',
    },
    zhipu: {
      apiKey: process.env.ZHIPU_API_KEY,
      model: process.env.ZHIPU_MODEL || 'glm-4',
    },
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL,
      model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
    },
  },
  webApiInternal: {
    baseUrl: process.env.WEB_API_INTERNAL_BASE || 'http://localhost:3004',
    serviceKey: process.env.SERVICE_KEY,
    cacheTtlMs: parseInt(process.env.USER_MODEL_CACHE_TTL || String(5 * 60 * 1000)),
  },
  routing: {
    strategy: (process.env.ROUTING_STRATEGY as any) || 'primary-fallback',
    primaryProvider: process.env.PRIMARY_LLM_PROVIDER || 'openai',
    fallbackProviders: process.env.FALLBACK_LLM_PROVIDERS?.split(',') || [
      'moonshot',
      'glm',
      'qwen',
    ],
    timeout: parseInt(process.env.LLM_TIMEOUT || '30000'),
    retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '2'),
    retryDelay: parseInt(process.env.RETRY_DELAY || '1000'),
  },
  cache: {
    enabled: process.env.CACHE_ENABLED !== 'false',
    ttl: parseInt(process.env.CACHE_TTL || '3600'),
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || '100'),
  },
  prompts: {
    systemPrompt:
      process.env.SYSTEM_PROMPT || '你是一个专业的面试助手，帮助用户准备和应对各种面试问题。',
    maxContextLength: parseInt(process.env.MAX_CONTEXT_LENGTH || '4000'),
    responseFormats: {
      concise: process.env.FORMAT_CONCISE || '用一句话简洁回答',
      points: process.env.FORMAT_POINTS || '列出3-5个要点',
      detailed: process.env.FORMAT_DETAILED || '提供详细的回答',
    },
  },
});

export type Config = z.infer<typeof configSchema>;
