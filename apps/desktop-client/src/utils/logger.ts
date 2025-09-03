// 简单的日志实现，用于快速修复启动问题
// 后续可以替换回完整的 logger 系统

interface Logger {
  info(message: string | object, ...args: any[]): void;
  warn(message: string | object, ...args: any[]): void;
  error(message: string | object, ...args: any[]): void;
  debug(message: string | object, ...args: any[]): void;
}

class SimpleLogger implements Logger {
  private formatMessage(level: string, message: string | object, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const msg = typeof message === 'object' ? JSON.stringify(message) : message;
    return `[${timestamp}] [${level}] ${msg}${args.length ? ' ' + args.join(' ') : ''}`;
  }

  info(message: string | object, ...args: any[]): void {
    console.log(this.formatMessage('INFO', message, ...args));
  }

  warn(message: string | object, ...args: any[]): void {
    console.warn(this.formatMessage('WARN', message, ...args));
  }

  error(message: string | object, ...args: any[]): void {
    console.error(this.formatMessage('ERROR', message, ...args));
  }

  debug(message: string | object, ...args: any[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('DEBUG', message, ...args));
    }
  }
}

export const logger = new SimpleLogger();
