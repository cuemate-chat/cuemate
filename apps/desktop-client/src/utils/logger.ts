import fs from 'node:fs';
import path from 'node:path';

interface Logger {
  info(message: string | object, ...args: any[]): void;
  warn(message: string | object, ...args: any[]): void;
  error(message: string | object, ...args: any[]): void;
  debug(message: string | object, ...args: any[]): void;
}

class ElectronLogger implements Logger {
  private baseDir: string;
  private service: string;

  constructor() {
    // 使用统一的日志目录
    this.baseDir = process.env.CUEMATE_LOG_DIR || '/opt/cuemate/logs';
    this.service = 'desktop-client';

    // 确保日志目录存在
    this.ensureLogDirectories();
  }

  private ensureLogDirectories(): void {
    const levels = ['debug', 'info', 'warn', 'error'];
    for (const level of levels) {
      const levelDir = path.join(this.baseDir, level, this.service);
      try {
        fs.mkdirSync(levelDir, { recursive: true });
      } catch (error) {
        console.warn(`创建日志目录失败: ${levelDir}`, error);
      }
    }
  }

  private getDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getTimeString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  }

  private getLogFilePath(level: string): string {
    const dateStr = this.getDateString();
    return path.join(this.baseDir, level, this.service, dateStr, `${level}.log`);
  }

  private writeToFile(level: string, logObject: any): void {
    try {
      const filePath = this.getLogFilePath(level);
      const logLine = JSON.stringify(logObject) + '\n';

      // 确保目录存在
      const dirPath = path.dirname(filePath);
      fs.mkdirSync(dirPath, { recursive: true });

      // 使用追加模式写入文件
      fs.appendFileSync(filePath, logLine, 'utf8');
    } catch (error) {
      // 如果文件写入失败，只输出到控制台
      console.error('日志文件写入失败:', error);
    }
  }

  private createLogObject(level: string, message: string | object, args: any[]): any {
    const now = new Date();
    const levelMap: Record<string, number> = {
      debug: 20,
      info: 30,
      warn: 40,
      error: 50,
    };

    const msg = typeof message === 'object' ? JSON.stringify(message) : String(message);
    const fullMessage = args.length > 0 ? `${msg} ${args.join(' ')}` : msg;

    return {
      level: levelMap[level] || 30,
      time: now.getTime(),
      ts: this.getTimeString(),
      service: this.service,
      msg: fullMessage,
    };
  }

  private log(level: string, message: string | object, ...args: any[]): void {
    // 创建日志对象
    const logObject = this.createLogObject(level, message, args);

    // 输出到控制台
    const consoleMessage = this.formatMessage(level, message, ...args);
    switch (level) {
      case 'error':
        console.error(consoleMessage);
        break;
      case 'warn':
        console.warn(consoleMessage);
        break;
      case 'debug':
        if (process.env.NODE_ENV === 'development') {
          console.debug(consoleMessage);
        }
        break;
      default:
        console.log(consoleMessage);
        break;
    }

    // 写入文件
    this.writeToFile(level, logObject);
  }

  private formatMessage(level: string, message: string | object, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const msg = typeof message === 'object' ? JSON.stringify(message) : message;
    return `[${timestamp}] [${level.toUpperCase()}] ${msg}${args.length ? ' ' + args.join(' ') : ''}`;
  }

  info(message: string | object, ...args: any[]): void {
    this.log('info', message, ...args);
  }

  warn(message: string | object, ...args: any[]): void {
    this.log('warn', message, ...args);
  }

  error(message: string | object, ...args: any[]): void {
    this.log('error', message, ...args);
  }

  debug(message: string | object, ...args: any[]): void {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, ...args);
    }
  }
}

export const logger = new ElectronLogger();
