import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

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
  redis: z.object({
    host: z.string().default('localhost'),
    port: z.number().default(6379),
    password: z.string().optional(),
  }),
  fallback: z.object({
    enabled: z.boolean().default(true),
    primaryProvider: z.enum(['deepgram', 'whisper']).default('deepgram'),
    fallbackProvider: z.enum(['deepgram', 'whisper']).default('whisper'),
    maxRetries: z.number().default(3),
    retryDelayMs: z.number().default(1000),
  }),
});

export const config = configSchema.parse({
  server: {
    port: parseInt(process.env.ASR_PORT || '3001'),
    host: process.env.ASR_HOST || '0.0.0.0',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  audio: {
    sampleRate: parseInt(process.env.AUDIO_SAMPLE_RATE || '48000'),
    channels: parseInt(process.env.AUDIO_CHANNELS || '1'),
    frameSize: parseInt(process.env.AUDIO_FRAME_SIZE || '960'),
  },
  deepgram: {
    apiKey: process.env.DEEPGRAM_API_KEY,
    model: process.env.DEEPGRAM_MODEL || 'nova-2',
    language: process.env.DEEPGRAM_LANGUAGE || 'zh',
    punctuate: process.env.DEEPGRAM_PUNCTUATE !== 'false',
    profanityFilter: process.env.DEEPGRAM_PROFANITY_FILTER === 'true',
    redact: process.env.DEEPGRAM_REDACT === 'true',
    diarize: process.env.DEEPGRAM_DIARIZE === 'true',
    numerals: process.env.DEEPGRAM_NUMERALS !== 'false',
    endpointing: parseInt(process.env.DEEPGRAM_ENDPOINTING || '400'),
    interimResults: process.env.DEEPGRAM_INTERIM !== 'false',
    utteranceEndMs: parseInt(process.env.DEEPGRAM_UTTERANCE_END_MS || '1000'),
  },
  whisper: {
    modelPath: process.env.WHISPER_MODEL_PATH || './models/whisper',
    modelSize: (process.env.WHISPER_MODEL_SIZE as any) || 'base',
    language: process.env.WHISPER_LANGUAGE || 'zh',
    threads: parseInt(process.env.WHISPER_THREADS || '4'),
    useGpu: process.env.WHISPER_USE_GPU === 'true',
  },
  vad: {
    enabled: process.env.VAD_ENABLED !== 'false',
    threshold: parseFloat(process.env.VAD_THRESHOLD || '0.5'),
    preSpeechPadMs: parseInt(process.env.VAD_PRE_SPEECH_PAD_MS || '300'),
    postSpeechPadMs: parseInt(process.env.VAD_POST_SPEECH_PAD_MS || '600'),
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  fallback: {
    enabled: process.env.FALLBACK_ENABLED !== 'false',
    primaryProvider: (process.env.PRIMARY_ASR_PROVIDER as any) || 'deepgram',
    fallbackProvider: (process.env.FALLBACK_ASR_PROVIDER as any) || 'whisper',
    maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
    retryDelayMs: parseInt(process.env.RETRY_DELAY_MS || '1000'),
  },
});

export type Config = z.infer<typeof configSchema>;
