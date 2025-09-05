/**
 * 渲染进程日志工具 - 通过 IPC 发送到主进程
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

/**
 * 渲染进程日志函数
 * @param level 日志级别
 * @param message 日志消息
 */
export const log = async (level: LogLevel, message: string): Promise<void> => {
  try {
    if ((window as any).electronAPI) {
      await (window as any).electronAPI.log({ level, message });
    }
  } catch (error) {
    // 如果日志命令失败，静默处理
  }
};

/**
 * 便捷的日志方法
 */
export const logger = {
  info: (message: string) => log('info', message),
  warn: (message: string) => log('warn', message),
  error: (message: string) => log('error', message),
  debug: (message: string) => log('debug', message),
};