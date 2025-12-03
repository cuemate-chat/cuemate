import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import { getLoggerTimeZone, setLoggerTimeZone } from './tz.js';

// 默认日志目录：优先使用环境变量，否则使用相对路径
const DEFAULT_BASE_DIR = process.env.CUEMATE_LOG_DIR || path.join(process.cwd(), '../../logs');

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

  const transports: any = [];

  // 总是添加文件传输
  transports.push({
    target: transportTarget,
    options: { baseDir, service: options.service },
  });

  // 在开发环境或明确要求时添加 pretty 输出
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

  // 在生产环境（Docker 容器）中，添加控制台输出
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

/**
 * 日志数据类型
 */
export interface LogData {
  [key: string]: unknown;
}

/**
 * 模块级别 logger 接口
 */
export interface ModuleLogger {
  info: (func: string, message: string, data?: LogData, step?: string) => void;
  warn: (func: string, message: string, data?: LogData, step?: string) => void;
  error: (func: string, message: string, data?: LogData, error?: unknown, step?: string) => void;
  debug: (func: string, message: string, data?: LogData, step?: string) => void;
  http: {
    request: (func: string, url: string, method: string, body?: unknown) => void;
    response: (func: string, url: string, status: number, data?: unknown) => void;
    error: (func: string, url: string, error: unknown, requestData?: unknown, responseData?: unknown) => void;
  };
}

/**
 * 创建模块级别的 logger（推荐使用）
 *
 * @example
 * const log = createModuleLogger(logger, 'UserService');
 *
 * log.info('getUser', '获取用户', { userId: 1 });
 * log.error('getUser', '获取用户失败', { userId: 1 }, error, '数据库查询');
 * log.http.request('fetchData', '/api/data', 'POST', { id: 1 });
 * log.http.error('fetchData', '/api/data', error, requestBody, responseBody);
 */
export function createModuleLogger(baseLogger: pino.Logger, module: string): ModuleLogger {
  const formatMsg = (func: string, message: string, step?: string): string => {
    return step ? `[${module}][${func}][${step}] ${message}` : `[${module}][${func}] ${message}`;
  };

  const formatData = (data?: LogData, error?: unknown): Record<string, unknown> => {
    const result: Record<string, unknown> = {};

    if (error) {
      if (error instanceof Error) {
        result.error = { name: error.name, message: error.message, stack: error.stack };
      } else {
        result.error = String(error);
      }
    }

    if (data && Object.keys(data).length > 0) {
      result.data = data;
    }

    return result;
  };

  return {
    info: (func: string, message: string, data?: LogData, step?: string) => {
      baseLogger.info(formatData(data), formatMsg(func, message, step));
    },

    warn: (func: string, message: string, data?: LogData, step?: string) => {
      baseLogger.warn(formatData(data), formatMsg(func, message, step));
    },

    error: (func: string, message: string, data?: LogData, error?: unknown, step?: string) => {
      baseLogger.error(formatData(data, error), formatMsg(func, message, step));
    },

    debug: (func: string, message: string, data?: LogData, step?: string) => {
      baseLogger.debug(formatData(data), formatMsg(func, message, step));
    },

    http: {
      request: (func: string, url: string, method: string, body?: unknown) => {
        baseLogger.info(
          { data: body ? { requestBody: body } : undefined },
          formatMsg(func, `HTTP ${method} ${url}`),
        );
      },

      response: (func: string, url: string, status: number, data?: unknown) => {
        baseLogger.info(
          { data: data ? { responseData: data } : undefined },
          formatMsg(func, `HTTP Response ${status} from ${url}`),
        );
      },

      error: (func: string, url: string, error: unknown, requestData?: unknown, responseData?: unknown) => {
        const errorInfo = error instanceof Error
          ? { name: error.name, message: error.message }
          : { message: String(error) };
        baseLogger.error(
          {
            error: errorInfo,
            data: {
              ...(requestData ? { request: requestData } : {}),
              ...(responseData ? { response: responseData } : {}),
            },
          },
          formatMsg(func, `HTTP Error from ${url}`),
        );
      },
    },
  };
}

// Banner 工具函数
export function printBanner(serviceName: string, version?: string, port?: number) {
  const serviceVersion = version || process.env.VERSION || 'N/A';
  const banner = `
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║    ██████╗██╗   ██╗███████╗███╗   ███╗ █████╗ ████████╗███████╗
║   ██╔════╝██║   ██║██╔════╝████╗ ████║██╔══██╗╚══██╔══╝██╔════╝
║   ██║     ██║   ██║█████╗  ██╔████╔██║███████║   ██║   █████╗  
║   ██║     ╚██╗ ██╔╝██╔══╝  ██║╚██╔╝██║██╔══██║   ██║   ██╔══╝  
║   ╚██████╗ ╚████╔╝ ███████╗██║ ╚═╝ ██║██║  ██║   ██║   ███████╗
║    ╚═════╝  ╚═══╝  ╚══════╝╚═╝     ╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝
║                                                              ║
║  Service: ${serviceName.padEnd(20)} Version: ${serviceVersion.padEnd(10)} ║
║  Port: ${port ? port.toString().padEnd(20) : 'N/A'.padEnd(20)} ║
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(15)} ║
║  Started: ${new Date().toISOString().padEnd(20)} ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`;
  console.log(banner);
}

// 成功启动信息工具函数
export function printSuccessInfo(
  serviceName: string,
  port: number,
  additionalInfo?: Record<string, string>,
) {
  const separator = '=========================================';
  console.log(`[SUCCESS] ${separator}`);
  console.log(`[SUCCESS] 启动完成！`);
  console.log(`[SUCCESS] 服务名称: ${serviceName}`);
  console.log(`[SUCCESS] 端口号: ${port}`);

  if (additionalInfo) {
    Object.entries(additionalInfo).forEach(([key, value]) => {
      console.log(`[SUCCESS] ${key}: ${value}`);
    });
  }

  console.log(`[SUCCESS] ${separator}`);
}

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
