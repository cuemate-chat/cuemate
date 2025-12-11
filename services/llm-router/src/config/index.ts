import { z } from 'zod';

const configSchema = z.object({
  server: z.object({
    port: z.number().default(3002),
    host: z.string().default('0.0.0.0'),
  }),
  cors: z.object({
    origin: z.union([z.string(), z.array(z.string())]).default('*'),
  }),
  routing: z.object({
    strategy: z.enum(['primary-fallback', 'load-balance', 'fastest']).default('primary-fallback'),
    timeout: z.number().default(120000), // 120 seconds (2 minutes)
  }),
  webApiInternal: z.object({
    baseUrl: z.string().default('http://localhost:3001'),
    serviceKey: z.string().optional(),
    cacheTtlMs: z.number().default(5 * 60 * 1000),
  }),
});

export const config = configSchema.parse({
  server: {
    port: 3002,
    host: '0.0.0.0',
  },
  cors: {
    origin: '*',
  },
  routing: {
    strategy: 'primary-fallback',
    timeout: 120000,
  },
  webApiInternal: {
    baseUrl: 'http://localhost:3001',
    serviceKey: 'internal-service-key-2025',
    cacheTtlMs: 5 * 60 * 1000,
  },
});

export type Config = z.infer<typeof configSchema>;
