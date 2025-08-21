import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import { getLoggerTimeZone, setLoggerTimeZone } from './tz.js';

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
  const envTz = process.env.CUEMATE_LOG_TZ || process.env.TZ || undefined;
  if (envTz) setLoggerTimeZone(envTz);
  void getLoggerTimeZone();

  ensureDir(baseDir);
  ensureDir(path.join(baseDir, 'info'));
  ensureDir(path.join(baseDir, 'debug'));
  ensureDir(path.join(baseDir, 'warn'));
  ensureDir(path.join(baseDir, 'error'));

  const transports: any = [];

  // 总是添加文件传输
  transports.push({
    target: transportTarget,
    options: { baseDir, service: options.service },
  });

  // 在开发环境或明确要求时添加pretty输出
  if (isDevelopment && options.pretty) {
    transports.push({
      target: 'pino-pretty',
      options: {
        translateTime: 'yyyy-mm-dd HH:MM:ss.l o',
        ignore: 'pid,hostname',
        colorize: true,
      },
    });
  }

  // 在生产环境（Docker容器）中，添加控制台输出
  if (!isDevelopment) {
    transports.push({
      target: 'pino/file',
      options: { destination: 1 }, // stdout
    });
  }

  const logger = (pino as any)({
    level: options.level || (process.env.LOG_LEVEL as any) || 'info',
    base: { service: options.service },
    timestamp: () => `,"ts":"${formatLocalTime(new Date(), getLoggerTimeZone())}"`,
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
export { getLoggerTimeZone, setLoggerTimeZone } from './tz.js';

function formatLocalTime(d: Date, timeZone?: string): string {
  try {
    const parts = new Intl.DateTimeFormat('sv-SE', {
      timeZone: timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(d)
      .reduce(
        (acc: Record<string, string>, p) => {
          acc[p.type] = p.value;
          return acc;
        },
        {} as Record<string, string>,
      );
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
  } catch {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const HH = String(d.getHours()).padStart(2, '0');
    const MM = String(d.getMinutes()).padStart(2, '0');
    const SS = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${HH}:${MM}:${SS}`;
  }
}
