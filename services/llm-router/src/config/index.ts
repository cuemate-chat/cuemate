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
    // 所有提供商配置都从数据库动态获取，schema 只定义基本结构
    anthropic: z.object({}).optional(),
    azureOpenai: z.object({}).optional(),
    base: z.object({}).optional(),
    deepseek: z.object({}).optional(),
    gemini: z.object({}).optional(),
    kimi: z.object({}).optional(),
    moonshot: z.object({}).optional(),
    ollama: z.object({}).optional(),
    openai: z.object({}).optional(),
    openaiCompatible: z.object({}).optional(),
    qwen: z.object({}).optional(),
    siliconflow: z.object({}).optional(),
    tencent: z.object({}).optional(),
    vllm: z.object({}).optional(),
    volcengine: z.object({}).optional(),
    zhipu: z.object({}).optional(),
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
    // 空的 providers 对象，所有配置都从数据库动态获取
    anthropic: {},
    azureOpenai: {},
    base: {},
    deepseek: {},
    gemini: {},
    kimi: {},
    moonshot: {},
    ollama: {},
    openai: {},
    openaiCompatible: {},
    qwen: {},
    siliconflow: {},
    tencent: {},
    vllm: {},
    volcengine: {},
    zhipu: {},
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
