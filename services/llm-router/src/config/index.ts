import { z } from 'zod';

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
  routing: z.object({
    strategy: z.enum(['primary-fallback', 'load-balance', 'fastest']).default('primary-fallback'),
    primaryProvider: z.string().default('openai'),
    fallbackProviders: z.array(z.string()).default(['moonshot', 'glm', 'qwen']),
    timeout: z.number().default(120000), // 120 seconds (2 minutes)
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
    baseUrl: z.string().default('http://localhost:3001'),
    serviceKey: z.string().optional(),
    cacheTtlMs: z.number().default(5 * 60 * 1000),
  }),
});

// 使用简化配置，所有设置使用默认值
export const config = configSchema.parse({
  server: {
    port: 3002,
    host: '0.0.0.0',
  },
  cors: {
    origin: '*',
  },
  rateLimit: {
    max: 100,
    windowMs: '1 minute',
  },
  routing: {
    strategy: 'primary-fallback',
    primaryProvider: 'openai',
    fallbackProviders: ['moonshot', 'glm', 'qwen'],
    timeout: 120000,
    retryAttempts: 2,
    retryDelay: 1000,
  },
  cache: {
    enabled: true,
    ttl: 3600,
    maxSize: 100,
  },
  prompts: {
    systemPrompt: '你是一个专业的面试助手，帮助用户准备和应对各种面试问题。',
    maxContextLength: 4000,
    responseFormats: {
      concise: '用一句话简洁回答',
      points: '列出3-5个要点',
      detailed: '提供详细的回答',
    },
  },
  webApiInternal: {
    baseUrl: 'http://localhost:3001',
    serviceKey: 'internal-service-key-2025',
  },
  providers: {
    openai: {
      apiKey: undefined,
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-3.5-turbo',
      maxTokens: 2000,
    },
    moonshot: {
      apiKey: undefined,
      baseUrl: 'https://api.moonshot.cn/v1',
      model: 'moonshot-v1-8k',
      maxTokens: 2000,
    },
    glm: {
      apiKey: undefined,
      baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
      model: 'glm-4',
      maxTokens: 2000,
    },
    qwen: {
      apiKey: undefined,
      baseUrl: 'https://dashscope.aliyuncs.com/api/v1',
      model: 'qwen-turbo',
      maxTokens: 2000,
    },
  },
});

export type Config = z.infer<typeof configSchema>;
