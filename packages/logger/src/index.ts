import fs from 'node:fs';
import path from 'node:path';
import pino, { stdTimeFunctions } from 'pino';

const DEFAULT_BASE_DIR = process.env.CUEMATE_LOG_DIR || '/opt/cuemate/log';

function ensureDir(directoryPath: string) {
  try {
    fs.mkdirSync(directoryPath, { recursive: true });
  } catch {}
}

// 保留目录初始化逻辑在 createLogger 内，不在此处使用按天路径

// Use our custom transport that splits by level/date
const transportTarget = new URL('./transport.js', import.meta.url).pathname;

export type CreateLoggerOptions = {
  service: string;
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  baseDir?: string;
  pretty?: boolean;
  redactPaths?: string[];
};

export function createLogger(options: CreateLoggerOptions) {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const baseDir = options.baseDir || DEFAULT_BASE_DIR;

  ensureDir(baseDir);
  ensureDir(path.join(baseDir, 'info'));
  ensureDir(path.join(baseDir, 'debug'));
  ensureDir(path.join(baseDir, 'warn'));
  ensureDir(path.join(baseDir, 'error'));

  const transports: any = [];
  if (!isDevelopment || !options.pretty) {
    transports.push({
      target: transportTarget,
      options: { baseDir, service: options.service },
    });
  } else {
    transports.push({
      target: 'pino-pretty',
      options: {
        translateTime: 'yyyy-mm-dd HH:MM:ss.l o',
        ignore: 'pid,hostname',
        colorize: true,
      },
    });
  }

  const logger = (pino as any)({
    level: options.level || (process.env.LOG_LEVEL as any) || 'info',
    base: { service: options.service },
    timestamp: stdTimeFunctions.isoTime,
    redact: {
      paths: options.redactPaths || [
        'apiKey',
        'password',
        'token',
        'authorization',
        'Authorization',
        'messages[*].content',
      ],
      censor: '[REDACTED]',
    },
    transport: transports.length > 0 ? { targets: transports } : undefined,
  });

  return logger as pino.Logger;
}

export type AsyncFunc<TArgs extends any[] = any[], TReturn = any> = (
  ...args: TArgs
) => Promise<TReturn>;

export function withErrorLogging<TArgs extends any[], TReturn>(
  logger: pino.Logger,
  name: string,
  fn: AsyncFunc<TArgs, TReturn>,
): AsyncFunc<TArgs, TReturn> {
  return (async (...args: TArgs) => {
    try {
      return await fn(...args);
    } catch (error: any) {
      logger.error({ err: error, name, args: safeJson(args) }, `${name} failed`);
      throw error;
    }
  }) as AsyncFunc<TArgs, TReturn>;
}

function safeJson(input: unknown) {
  try {
    return JSON.parse(JSON.stringify(input));
  } catch {
    return undefined;
  }
}

export { fastifyLoggingHooks } from './fastify.js';
