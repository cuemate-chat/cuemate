import fs from 'node:fs';
import path from 'node:path';
import build from 'pino-abstract-transport';

type TransportOptions = {
  baseDir?: string;
  service?: string;
};

function ensureDir(dir: string) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {}
}

function getDateParts(date: Date) {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
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
    ? path.join(baseDir, level, service, dateStr)
    : path.join(baseDir, level, dateStr);
  ensureDir(dir);
  return path.join(dir, `${level}.log`);
}

export default async function transport(options: TransportOptions = {}) {
  const baseDir = options.baseDir || process.env.CUEMATE_LOG_DIR || '/opt/cuemate/log';
  const service = options.service;
  ensureDir(baseDir);
  const streams = new Map<string, fs.WriteStream>();

  function getStreamFor(level: string, dateStr: string) {
    const key = `${level}:${dateStr}`;
    let ws = streams.get(key);
    if (!ws) {
      const filePath = resolveLogPath(baseDir, level, service, dateStr);
      ws = fs.createWriteStream(filePath, { flags: 'a' });
      streams.set(key, ws);
    }
    return ws;
  }

  const buildAny: any = build as any;
  return buildAny(
    async function (source: any) {
      for await (const obj of source) {
        const timeValue: any = (obj as any)?.time || (obj as any)?.timestamp || Date.now();
        const d = new Date(typeof timeValue === 'string' ? timeValue : Number(timeValue));
        const dateStr = getDateParts(d);
        const level = getLevel(obj as any);
        const ws = getStreamFor(level, dateStr);
        ws.write(JSON.stringify(obj) + '\n');
      }
    },
    { parse: 'ndjson' },
  );
}
