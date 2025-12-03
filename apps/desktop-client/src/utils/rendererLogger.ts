/**
 * 渲染进程日志工具 - 结构化日志系统
 *
 * 设计原则：
 * 1. 每条日志必须能直接定位到代码位置（module + function）
 * 2. 错误日志必须包含完整的上下文数据
 * 3. HTTP 请求必须记录请求和响应内容
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogData {
  [key: string]: unknown;
}

async function sendLog(level: LogLevel, message: string): Promise<void> {
  // 开发环境同时输出到浏览器控制台，方便调试
  if (process.env.NODE_ENV !== 'production') {
    const consoleMethods: Record<LogLevel, (...args: any[]) => void> = {
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    };
    consoleMethods[level]?.(`[${level.toUpperCase()}]`, message);
  }

  // 发送到主进程写入日志文件
  try {
    if ((window as any).electronAPI) {
      await (window as any).electronAPI.log({ level, message });
    }
  } catch {
    // 静默处理
  }
}

/**
 * 创建模块级别的 logger（推荐使用）
 *
 * @example
 * const log = createLogger('MockInterviewEntryBody');
 *
 * log.info('handleAIAnalyzing', '开始分析', { questionIndex: 1 });
 * log.error('handleAIAnalyzing', 'JSON解析失败', { llmResponse: '...' }, error, '第八步');
 * log.http.request('fetchData', '/api/data', 'POST', { id: 1 });
 * log.http.error('fetchData', '/api/data', error, requestBody, responseBody);
 */
export function createLogger(module: string) {
  const formatMsg = (func: string, message: string, data?: LogData, step?: string, error?: unknown): string => {
    const parts: string[] = [];
    const location = step ? `[${module}][${func}][${step}]` : `[${module}][${func}]`;
    parts.push(location);
    parts.push(message);

    if (error) {
      const errInfo = error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error);
      parts.push(`| Error: ${errInfo}`);
    }

    if (data && Object.keys(data).length > 0) {
      parts.push(`| Data: ${JSON.stringify(data)}`);
    }

    return parts.join(' ');
  };

  return {
    info: async (func: string, message: string, data?: LogData, step?: string) => {
      await sendLog('info', formatMsg(func, message, data, step));
    },

    warn: async (func: string, message: string, data?: LogData, step?: string) => {
      await sendLog('warn', formatMsg(func, message, data, step));
    },

    error: async (func: string, message: string, data?: LogData, error?: unknown, step?: string) => {
      await sendLog('error', formatMsg(func, message, data, step, error));
    },

    debug: async (func: string, message: string, data?: LogData, step?: string) => {
      await sendLog('debug', formatMsg(func, message, data, step));
    },

    http: {
      request: async (func: string, url: string, method: string, body?: unknown) => {
        await sendLog('info', formatMsg(func, `HTTP ${method} ${url}`, body ? { requestBody: body } : undefined));
      },

      response: async (func: string, url: string, status: number, data?: unknown) => {
        await sendLog('info', formatMsg(func, `HTTP Response ${status} from ${url}`, data ? { responseData: data } : undefined));
      },

      error: async (func: string, url: string, error: unknown, requestData?: unknown, responseData?: unknown) => {
        await sendLog('error', formatMsg(func, `HTTP Error from ${url}`, {
          ...(requestData ? { request: requestData } : {}),
          ...(responseData ? { response: responseData } : {}),
        }, undefined, error));
      },
    },
  };
}

/**
 * 简单 logger - 保持向后兼容
 * 自动解析 [步骤] 格式的消息
 */
export const logger = {
  info: async (message: string, data?: LogData) => {
    const formatted = data ? `${message} | Data: ${JSON.stringify(data)}` : message;
    await sendLog('info', formatted);
  },

  warn: async (message: string, data?: LogData) => {
    const formatted = data ? `${message} | Data: ${JSON.stringify(data)}` : message;
    await sendLog('warn', formatted);
  },

  error: async (message: string, data?: LogData, error?: unknown) => {
    let formatted = message;
    if (error) {
      const errInfo = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      formatted += ` | Error: ${errInfo}`;
    }
    if (data && Object.keys(data).length > 0) {
      formatted += ` | Data: ${JSON.stringify(data)}`;
    }
    await sendLog('error', formatted);
  },

  debug: async (message: string, data?: LogData) => {
    const formatted = data ? `${message} | Data: ${JSON.stringify(data)}` : message;
    await sendLog('debug', formatted);
  },
};
