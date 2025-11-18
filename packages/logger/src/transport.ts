import fs from 'node:fs';
import path from 'node:path';
import build from 'pino-abstract-transport';
import { getLoggerTimeZone } from './tz.js';

type TransportOptions = {
  baseDir?: string;
  service?: string;
};

function ensureDir(dir: string) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {}
}

function getDateStringInTimeZone(d: Date, timeZone?: string): string {
  try {
    const parts = new Intl.DateTimeFormat('sv-SE', {
      timeZone: timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(d)
      .reduce(
        (acc: Record<string, string>, p) => {
          acc[p.type] = p.value;
          return acc;
        },
        {} as Record<string, string>,
      );
    return `${parts.year}-${parts.month}-${parts.day}`;
  } catch {
    const yyyy = String(d.getFullYear());
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}

function getLevel(obj: any): 'debug' | 'info' | 'warn' | 'error' {
  const levelVal = obj?.level;
  // Pino numeric levels: 10 trace, 20 debug, 30 info, 40 warn, 50 error, 60 fatal
  if (typeof levelVal === 'number') {
    if (levelVal >= 50) return 'error';
    if (levelVal >= 40) return 'warn';
    if (levelVal >= 30) return 'info';
    return 'debug';
  }
  const lvl = String(levelVal || '').toLowerCase();
  if (lvl.includes('error')) return 'error';
  if (lvl.includes('warn')) return 'warn';
  if (lvl.includes('info')) return 'info';
  return 'debug';
}

function resolveLogPath(
  baseDir: string,
  level: string,
  service: string | undefined,
  dateStr: string,
) {
  const dir = service
    ? path.join(baseDir, service, dateStr)
    : path.join(baseDir, dateStr);
  ensureDir(dir);
  return path.join(dir, `${level}.log`);
}

export default async function transport(options: TransportOptions = {}) {
  const baseDir = options.baseDir || process.env.CUEMATE_LOG_DIR || path.join(process.cwd(), '../../logs');
  const service = options.service;
  const timeZone = getLoggerTimeZone();
  ensureDir(baseDir);
  const streams = new Map<string, fs.WriteStream>();

  function ensureFile(level: string, dateStr: string) {
    const key = `${level}:${dateStr}`;
    let ws = streams.get(key);
    if (!ws) {
      const filePath = resolveLogPath(baseDir, level, service, dateStr);
      try {
        // 确保文件存在
        fs.closeSync(fs.openSync(filePath, 'a'));
        // 创建写入流，写入到实际文件而不是/dev/null
        ws = fs.createWriteStream(filePath, { flags: 'a' });
        streams.set(key, ws);
      } catch (error) {
        // 如果创建失败，返回文件路径让 prependLine 处理
        return resolveLogPath(baseDir, level, service, dateStr);
      }
    }
    return resolveLogPath(baseDir, level, service, dateStr);
  }

  const buildAny: any = build as any;
  return buildAny(
    async function (source: any) {
      for await (const obj of source) {
        const anyObj = obj as any;
        const tsText: unknown = anyObj?.ts;
        const timeValue: unknown = anyObj?.time ?? anyObj?.timestamp;
        let dateStr: string;
        if (typeof tsText === 'string' && /^\d{4}-\d{2}-\d{2}/.test(tsText)) {
          dateStr = tsText.slice(0, 10);
        } else if (typeof timeValue === 'number') {
          dateStr = getDateStringInTimeZone(new Date(timeValue), timeZone);
        } else if (typeof timeValue === 'string') {
          dateStr = getDateStringInTimeZone(new Date(timeValue), timeZone);
        } else {
          dateStr = getDateStringInTimeZone(new Date(), timeZone);
        }
        const level = getLevel(obj as any);
        const filePath = ensureFile(level, dateStr);
        const line = JSON.stringify(obj) + '\n';
        prependLine(filePath, line);
      }
    },
    { parse: 'ndjson' },
  );
}

function prependLine(filePath: string, data: string) {
  try {
    let existing = '';
    try {
      existing = fs.readFileSync(filePath, 'utf8');
    } catch {}
    fs.writeFileSync(filePath, data + existing, 'utf8');
  } catch {}
}
