import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { buildPrefixedError } from '../utils/error-response.js';

const LOG_BASE_DIR = process.env.CUEMATE_LOG_DIR || '/opt/cuemate/logs';
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
    } catch (err: any) {
      (req as any).log.error({ err: err }, 'read-log-failed');
      return reply.code(404).send(buildPrefixedError('读取日志失败', err, 404));
    }
  });

  // 清理指定日志文件内容
  app.get('/logs/clear', async (req, reply) => {
    const schema = z.object({
      level: z.enum(LEVELS),
      service: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    });

    try {
      // 从query参数获取，因为前端使用GET方式传递参数
      const query = (req as any).query || {};
      (req as any).log.debug({ query }, 'clear-log-query-params');

      const { level, service, date } = schema.parse(query);

      // 验证参数
      if (!level || !service || !date) {
        return reply.code(400).send({
          error: 'invalid_params',
          message: '缺少必要参数：level, service, date',
        });
      }

      const filePath = path.join(LOG_BASE_DIR, level, service, date, `${level}.log`);

      // 检查文件是否存在
      try {
        const stat = fs.statSync(filePath);
        if (!stat.isFile()) {
          return reply.code(404).send({
            error: 'not_found',
            message: '日志文件不存在',
          });
        }
      } catch (statErr) {
        return reply.code(404).send({
          error: 'not_found',
          message: '日志文件不存在或无法访问',
        });
      }

      // 清空文件内容（保留文件，只清空内容）
      try {
        fs.writeFileSync(filePath, '', 'utf8');
        (req as any).log.debug({ level, service, date }, 'log-file-cleared');
        return { success: true, message: '日志文件已清空' };
      } catch (writeErr: any) {
        (req as any).log.error({ err: writeErr, level, service, date }, 'write-log-failed');
        return reply.code(500).send(buildPrefixedError('清空日志失败', writeErr, 500));
      }
    } catch (parseErr: any) {
      (req as any).log.error({ err: parseErr }, 'parse-params-failed');
      return reply.code(400).send(buildPrefixedError('参数解析失败', parseErr, 400));
    }
  });

  // 删除指定日志文件
  app.delete('/logs/delete', async (req, reply) => {
    const schema = z.object({
      level: z.enum(LEVELS),
      service: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    });

    try {
      // 从query参数获取
      const query = (req as any).query || {};
      (req as any).log.debug({ query }, 'delete-log-query-params');

      const { level, service, date } = schema.parse(query);

      // 验证参数
      if (!level || !service || !date) {
        return reply.code(400).send({
          error: 'invalid_params',
          message: '缺少必要参数：level, service, date',
        });
      }

      const filePath = path.join(LOG_BASE_DIR, level, service, date, `${level}.log`);
      const dirPath = path.dirname(filePath);

      // 检查文件是否存在
      try {
        const stat = fs.statSync(filePath);
        if (!stat.isFile()) {
          return reply.code(404).send({
            error: 'not_found',
            message: '日志文件不存在',
          });
        }
      } catch (statErr) {
        return reply.code(404).send({
          error: 'not_found',
          message: '日志文件不存在或无法访问',
        });
      }

      // 删除日志文件
      try {
        fs.unlinkSync(filePath);
        (req as any).log.debug({ level, service, date }, 'log-file-deleted');

        // 检查目录是否为空，如果为空则删除目录
        try {
          const remainingFiles = fs.readdirSync(dirPath);
          if (remainingFiles.length === 0) {
            fs.rmdirSync(dirPath);
            (req as any).log.debug({ dirPath }, 'empty-directory-removed');
          }
        } catch (dirErr) {
          // 忽略目录删除错误，不影响文件删除的成功
          (req as any).log.warn({ err: dirErr, dirPath }, 'failed-to-remove-empty-directory');
        }

        return { success: true, message: '日志文件已删除' };
      } catch (deleteErr: any) {
        (req as any).log.error({ err: deleteErr, level, service, date }, 'delete-log-failed');
        return reply.code(500).send(buildPrefixedError('日志删除失败', deleteErr, 500));
      }
    } catch (parseErr: any) {
      (req as any).log.error({ err: parseErr }, 'parse-params-failed');
      return reply.code(400).send(buildPrefixedError('参数解析失败', parseErr, 400));
    }
  });
}
