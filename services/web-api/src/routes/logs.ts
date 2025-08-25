import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const LOG_BASE_DIR = process.env.CUEMATE_LOG_DIR || '/opt/cuemate/log';
const LEVELS = ['debug', 'info', 'warn', 'error'] as const;
type Level = (typeof LEVELS)[number];

function clampPageSize(ps?: number) {
  const n = Number(ps || 10);
  if (!Number.isFinite(n) || n <= 0) return 10;
  return Math.min(n, 100);
}

function safeList(dir: string) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [] as fs.Dirent[];
  }
}

function getServices(): string[] {
  const set = new Set<string>();
  for (const lvl of LEVELS) {
    const levelDir = path.join(LOG_BASE_DIR, lvl);
    for (const entry of safeList(levelDir)) {
      if (entry.isDirectory()) set.add(entry.name);
    }
  }
  return Array.from(set).sort();
}

export function registerLogRoutes(app: FastifyInstance) {
  // 获取可用的服务列表
  app.get('/logs/services', async () => {
    return { services: getServices(), levels: LEVELS } as const;
  });

  // 日志列表，按 级别/服务/日期 过滤，分页
  app.get('/logs', async (req) => {
    const schema = z.object({
      level: z.enum(LEVELS).optional(),
      service: z.string().optional(),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      page: z.coerce.number().min(1).default(1),
      pageSize: z.coerce.number().min(1).max(100).default(10),
    });
    const { level, service, date, page, pageSize } = schema.parse((req as any).query || {});

    // 组装候选文件
    const candidates: Array<{
      level: Level;
      service: string;
      date: string;
      file: string;
      size: number;
      mtimeMs: number;
      ctimeMs: number;
    }> = [];

    const levels = level ? [level] : LEVELS;
    for (const lvl of levels) {
      const levelDir = path.join(LOG_BASE_DIR, lvl);
      const services = service
        ? [service]
        : safeList(levelDir)
            .filter((d) => d.isDirectory())
            .map((d) => d.name);
      for (const svc of services) {
        const svcDir = path.join(levelDir, svc);
        const dates = date
          ? [date]
          : safeList(svcDir)
              .filter((d) => d.isDirectory())
              .map((d) => d.name);
        for (const dt of dates) {
          const filePath = path.join(svcDir, dt, `${lvl}.log`);
          try {
            const stat = fs.statSync(filePath);
            if (!stat.isFile()) continue;
            candidates.push({
              level: lvl,
              service: svc,
              date: dt,
              file: filePath,
              size: stat.size,
              mtimeMs: stat.mtimeMs,
              ctimeMs: stat.birthtimeMs || stat.mtimeMs, // 使用创建时间，如果没有则回退到修改时间
            });
          } catch {}
        }
      }
    }

    // 最新创建时间优先
    candidates.sort((a, b) => b.ctimeMs - a.ctimeMs);

    const ps = clampPageSize(pageSize);
    const start = (page - 1) * ps;
    const pageItems = candidates.slice(start, start + ps);

    // 仅返回概要信息
    const items = pageItems.map((x) => ({
      level: x.level,
      service: x.service,
      date: x.date,
      size: x.size,
      mtimeMs: x.mtimeMs,
    }));

    return { total: candidates.length, items };
  });

  // 读取指定日志内容（按级别/服务/日期）
  app.get('/logs/content', async (req, reply) => {
    const schema = z.object({
      level: z.enum(LEVELS),
      service: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      tail: z.coerce.number().min(1).max(1000).default(500),
    });
    const { level, service, date, tail } = schema.parse((req as any).query || {});
    const filePath = path.join(LOG_BASE_DIR, level, service, date, `${level}.log`);
    try {
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) return reply.code(404).send({ error: 'not_found' });
      // 读取尾部 N 行
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split(/\r?\n/);
      const start = Math.max(0, lines.length - tail);
      const tailLines = lines.slice(start).filter((l) => l.length > 0);
      return { level, service, date, lines: tailLines };
    } catch (err) {
      (req as any).log.error({ err: err }, 'read-log-failed');
      return reply.code(404).send({ error: 'not_found' });
    }
  });

  // 清理指定日志文件内容
  app.post('/logs/clear', async (req, reply) => {
    const schema = z.object({
      level: z.enum(LEVELS),
      service: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    });
    const { level, service, date } = schema.parse((req as any).query || {});
    const filePath = path.join(LOG_BASE_DIR, level, service, date, `${level}.log`);

    try {
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) return reply.code(404).send({ error: 'not_found' });

      // 清空文件内容（保留文件，只清空内容）
      fs.writeFileSync(filePath, '', 'utf8');

      (req as any).log.debug({ level, service, date }, 'log-file-cleared');
      return { success: true, message: '日志文件已清空' };
    } catch (err) {
      (req as any).log.error({ err, level, service, date }, 'clear-log-failed');
      return reply.code(500).send({ error: 'clear_failed', message: '清理日志文件失败' });
    }
  });
}
