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
    openai: z.object({
      apiKey: z.string().optional(),
      model: z.string().default('gpt-4-turbo-preview'),
      maxTokens: z.number().default(2000),
      temperature: z.number().default(0.7),
      streamEnabled: z.boolean().default(true),
    }),
    moonshot: z.object({
      apiKey: z.string().optional(),
      model: z.string().default('moonshot-v1-8k'),
      baseUrl: z.string().default('https://api.moonshot.cn/v1'),
      maxTokens: z.number().default(2000),
      temperature: z.number().default(0.7),
    }),
    glm: z.object({
      apiKey: z.string().optional(),
      model: z.string().default('glm-4'),
      baseUrl: z.string().default('https://open.bigmodel.cn/api/paas/v4'),
      maxTokens: z.number().default(2000),
      temperature: z.number().default(0.7),
    }),
    qwen: z.object({
      apiKey: z.string().optional(),
      model: z.string().default('qwen-max'),
      baseUrl: z.string().default('https://dashscope.aliyuncs.com/api/v1'),
      maxTokens: z.number().default(2000),
      temperature: z.number().default(0.7),
    }),
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
  redis: z.object({
    host: z.string().default('localhost'),
    port: z.number().default(6379),
    password: z.string().optional(),
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
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
      streamEnabled: process.env.OPENAI_STREAM !== 'false',
    },
    moonshot: {
      apiKey: process.env.MOONSHOT_API_KEY,
      model: process.env.MOONSHOT_MODEL || 'moonshot-v1-8k',
      baseUrl: process.env.MOONSHOT_BASE_URL || 'https://api.moonshot.cn/v1',
      maxTokens: parseInt(process.env.MOONSHOT_MAX_TOKENS || '2000'),
      temperature: parseFloat(process.env.MOONSHOT_TEMPERATURE || '0.7'),
    },
    glm: {
      apiKey: process.env.GLM_API_KEY,
      model: process.env.GLM_MODEL || 'glm-4',
      baseUrl: process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
      maxTokens: parseInt(process.env.GLM_MAX_TOKENS || '2000'),
      temperature: parseFloat(process.env.GLM_TEMPERATURE || '0.7'),
    },
    qwen: {
      apiKey: process.env.QWEN_API_KEY,
      model: process.env.QWEN_MODEL || 'qwen-max',
      baseUrl: process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1',
      maxTokens: parseInt(process.env.QWEN_MAX_TOKENS || '2000'),
      temperature: parseFloat(process.env.QWEN_TEMPERATURE || '0.7'),
    },
  },
  routing: {
    strategy: (process.env.ROUTING_STRATEGY as any) || 'primary-fallback',
    primaryProvider: process.env.PRIMARY_LLM_PROVIDER || 'openai',
    fallbackProviders: process.env.FALLBACK_LLM_PROVIDERS?.split(',') || ['moonshot', 'glm', 'qwen'],
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
    systemPrompt: process.env.SYSTEM_PROMPT || '你是一个专业的面试助手，帮助用户准备和应对各种面试问题。',
    maxContextLength: parseInt(process.env.MAX_CONTEXT_LENGTH || '4000'),
    responseFormats: {
      concise: process.env.FORMAT_CONCISE || '用一句话简洁回答',
      points: process.env.FORMAT_POINTS || '列出3-5个要点',
      detailed: process.env.FORMAT_DETAILED || '提供详细的回答',
    },
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
});

export type Config = z.infer<typeof configSchema>;
