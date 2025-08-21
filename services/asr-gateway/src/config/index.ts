import { z } from 'zod';

const configSchema = z.object({
  server: z.object({
    port: z.number().default(3001),
    host: z.string().default('0.0.0.0'),
  }),
  cors: z.object({
    origin: z.union([z.string(), z.array(z.string())]).default('*'),
  }),
  audio: z.object({
    sampleRate: z.number().default(48000),
    channels: z.number().default(1),
    frameSize: z.number().default(960), // 20ms at 48kHz
  }),
  deepgram: z.object({
    apiKey: z.string().optional(),
    model: z.string().default('nova-2'),
    language: z.string().default('zh'),
    punctuate: z.boolean().default(true),
    profanityFilter: z.boolean().default(false),
    redact: z.boolean().default(false),
    diarize: z.boolean().default(false),
    numerals: z.boolean().default(true),
    endpointing: z.number().default(400), // ms
    interimResults: z.boolean().default(true),
    utteranceEndMs: z.number().default(1000),
  }),
  whisper: z.object({
    modelPath: z.string().default('./models/whisper'),
    modelSize: z.enum(['tiny', 'base', 'small', 'medium', 'large']).default('base'),
    language: z.string().default('zh'),
    threads: z.number().default(4),
    useGpu: z.boolean().default(false),
  }),
  vad: z.object({
    enabled: z.boolean().default(true),
    threshold: z.number().default(0.5),
    preSpeechPadMs: z.number().default(300),
    postSpeechPadMs: z.number().default(600),
  }),
  fallback: z.object({
    enabled: z.boolean().default(true),
    primaryProvider: z.enum(['deepgram', 'whisper']).default('deepgram'),
    fallbackProvider: z.enum(['deepgram', 'whisper']).default('whisper'),
    maxRetries: z.number().default(3),
    retryDelayMs: z.number().default(1000),
  }),
});

// 使用简化配置，所有设置使用默认值
export const config = configSchema.parse({
  server: {
    port: 3001,
    host: '0.0.0.0',
  },
  cors: {
    origin: '*',
  },
  audio: {
    sampleRate: 48000,
    channels: 1,
    frameSize: 960,
  },
  deepgram: {
    model: 'nova-2',
    language: 'zh',
    punctuate: true,
    profanityFilter: false,
    redact: false,
    diarize: false,
    numerals: true,
    endpointing: 400,
    interimResults: true,
    utteranceEndMs: 1000,
  },
  whisper: {
    modelPath: './models/whisper',
    modelSize: 'base',
    language: 'zh',
    threads: 4,
    useGpu: false,
  },
  vad: {
    enabled: true,
    threshold: 0.5,
    preSpeechPadMs: 300,
    postSpeechPadMs: 600,
  },
  fallback: {
    enabled: true,
    primaryProvider: 'deepgram',
    fallbackProvider: 'whisper',
    maxRetries: 3,
    retryDelayMs: 1000,
  },
});

export type Config = z.infer<typeof configSchema>;
