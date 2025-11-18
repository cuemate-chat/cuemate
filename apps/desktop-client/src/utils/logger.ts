import fs from 'node:fs';
import path from 'node:path';
import { getLogsDir } from '../main/utils/paths.js';

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
    // 使用统一的日志目录（相对路径）
    this.baseDir = process.env.CUEMATE_LOG_DIR || getLogsDir();
    this.service = 'desktop-client';
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
    // 使用上海时区格式化时间
    const timeString = now.toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    // 转换格式从 "2025/09/05 20:16:49" 到 "2025-09-05 20:16:49"
    return timeString.replace(/\//g, '-');
  }

  private getLogFilePath(level: string): string {
    const dateStr = this.getDateString();
    return path.join(this.baseDir, this.service, dateStr, `${level}.log`);
  }

  private writeToFile(level: string, logObject: any): void {
    try {
      const filePath = this.getLogFilePath(level);
      const logLine = JSON.stringify(logObject) + '\n';

      // 确保目录存在
      const dirPath = path.dirname(filePath);
      fs.mkdirSync(dirPath, { recursive: true });

      // 使用 prepend 模式写入文件（将新日志插入到文件开头，保持与其他服务一致）
      let existing = '';
      try {
        if (fs.existsSync(filePath)) {
          existing = fs.readFileSync(filePath, 'utf8');
        }
      } catch {}
      fs.writeFileSync(filePath, logLine + existing, 'utf8');
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
    const timestamp = this.getTimeString();
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
