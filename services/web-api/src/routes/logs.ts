import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { buildPrefixedError } from '../utils/error-response.js';
import { logOperation, OPERATION_MAPPING } from '../utils/operation-logger-helper.js';
import { OperationType } from '../utils/operation-logger.js';

const LOG_BASE_DIR = process.env.CUEMATE_LOG_DIR || path.join(process.cwd(), '../../logs');
const LEVELS = ['debug', 'info', 'warn', 'error'] as const;
type Level = (typeof LEVELS)[number];

// 固定的服务列表
const SERVICES = ['web-api', 'llm-router', 'rag-service', 'cuemate-asr', 'desktop-client'] as const;

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
  return [...SERVICES];
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

    // 新目录结构：{LOG_BASE_DIR}/{service}/{date}/{level}.log
    const services = service ? [service] : getServices();
    for (const svc of services) {
      const svcDir = path.join(LOG_BASE_DIR, svc);
      const dates = date
        ? [date]
        : safeList(svcDir)
            .filter((d) => d.isDirectory())
            .map((d) => d.name);
      for (const dt of dates) {
        const dateDir = path.join(svcDir, dt);
        const levels = level ? [level] : LEVELS;
        for (const lvl of levels) {
          const filePath = path.join(dateDir, `${lvl}.log`);
          try {
            const stat = fs.statSync(filePath);
            if (!stat.isFile()) continue;
            // 过滤掉空文件（大小为 0）
            if (stat.size === 0) continue;
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

    // 按日期降序排列，然后按服务名称和级别排序
    candidates.sort((a, b) => {
      // 首先按日期降序
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      // 首先按级别排序
      const levelOrder = { error: 0, warn: 1, debug: 2, info: 3 };
      const aLevelOrder = levelOrder[a.level];
      const bLevelOrder = levelOrder[b.level];
      if (aLevelOrder !== bLevelOrder) {
        return aLevelOrder - bLevelOrder;
      }
      // 然后按服务名称优先级排序
      const serviceOrder: Record<string, number> = {
        'web-api': 0,
        'llm-router': 1,
        'rag-service': 2,
        'cuemate-asr': 3,
        'desktop-client': 4,
      };
      const aServiceOrder = serviceOrder[a.service] ?? 999;
      const bServiceOrder = serviceOrder[b.service] ?? 999;
      return aServiceOrder - bServiceOrder;
    });

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
    const filePath = path.join(LOG_BASE_DIR, service, date, `${level}.log`);
    try {
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) return reply.code(404).send({ error: 'not_found' });
      // 读取尾部 N 行
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split(/\r?\n/);
      const start = Math.max(0, lines.length - tail);
      const tailLines = lines.slice(start).filter((l) => l.length > 0);
      // cuemate-asr 日志是正序写入的（tee 追加），需要倒序显示；其他服务用 prepend 写入，已经是倒序
      if (service === 'cuemate-asr') {
        tailLines.reverse();
      }
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
      // 从 query 参数获取，因为前端使用 GET 方式传递参数
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

      const filePath = path.join(LOG_BASE_DIR, service, date, `${level}.log`);

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

        // 记录操作日志
        try {
          await (req as any).jwtVerify();
          const payload = (req as any).user as any;
          await logOperation(app, req, {
            ...OPERATION_MAPPING.SYSTEM,
            resourceId: `${level}_${service}_${date}`,
            resourceName: `日志文件: ${level}/${service}/${date}`,
            operation: OperationType.UPDATE,
            message: `清空日志文件: ${level}/${service}/${date}`,
            status: 'success',
            userId: payload.uid,
          });
        } catch (authError) {
          // 日志操作不需要认证，但如果有认证信息就记录操作日志
          (req as any).log.info('日志清空操作未记录操作日志（无认证信息）');
        }

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
      // 从 query 参数获取
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

      const filePath = path.join(LOG_BASE_DIR, service, date, `${level}.log`);
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

        // 记录操作日志
        try {
          await (req as any).jwtVerify();
          const payload = (req as any).user as any;
          await logOperation(app, req, {
            ...OPERATION_MAPPING.SYSTEM,
            resourceId: `${level}_${service}_${date}`,
            resourceName: `日志文件: ${level}/${service}/${date}`,
            operation: OperationType.DELETE,
            message: `删除日志文件: ${level}/${service}/${date}`,
            status: 'success',
            userId: payload.uid,
          });
        } catch (authError) {
          // 日志操作不需要认证，但如果有认证信息就记录操作日志
          (req as any).log.info('日志删除操作未记录操作日志（无认证信息）');
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

  // 清理今日所有日志文件内容
  app.get('/logs/clear-today', async (req, reply) => {
    try {
      // 获取今日日期（使用本地时区）
      const today = new Date();
      const todayStr = today
        .toLocaleDateString('zh-CN', {
          timeZone: 'Asia/Shanghai',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
        .replace(/\//g, '-'); // YYYY-MM-DD 格式

      (req as any).log.info({ today: todayStr }, '开始清理今日日志');

      let clearedCount = 0;
      const errors: string[] = [];

      // 遍历所有服务
      const services = getServices();
      for (const service of services) {
        const serviceDir = path.join(LOG_BASE_DIR, service);

        // 检查今日目录是否存在
        const todayDir = path.join(serviceDir, todayStr);
        if (!fs.existsSync(todayDir)) {
          continue;
        }

        // 遍历所有日志级别
        for (const level of LEVELS) {
          // 检查今日日志文件是否存在
          const logFile = path.join(todayDir, `${level}.log`);
          if (!fs.existsSync(logFile)) {
            continue;
          }

          try {
            // 清空文件内容（保留文件，只清空内容）
            fs.writeFileSync(logFile, '', 'utf8');
            clearedCount++;
            (req as any).log.debug({ level, service, date: todayStr }, '今日日志文件已清空');
          } catch (clearErr: any) {
            const errorMsg = `清空 ${service}/${todayStr}/${level} 失败: ${clearErr.message}`;
            errors.push(errorMsg);
            (req as any).log.error(
              { err: clearErr, level, service, date: todayStr },
              '清空今日日志文件失败',
            );
          }
        }
      }

      // 记录操作日志
      try {
        await (req as any).jwtVerify();
        const payload = (req as any).user as any;
        await logOperation(app, req, {
          ...OPERATION_MAPPING.SYSTEM,
          resourceId: `today_logs_${todayStr}`,
          resourceName: `今日日志文件 (${todayStr})`,
          operation: OperationType.UPDATE,
          message: `批量清空今日日志文件，共清理 ${clearedCount} 个文件`,
          status: errors.length > 0 ? 'failed' : 'success',
          userId: payload.uid,
        });
      } catch (authError) {
        // 日志操作不需要认证，但如果有认证信息就记录操作日志
        (req as any).log.info('今日日志清空操作未记录操作日志（无认证信息）');
      }

      (req as any).log.info(
        {
          clearedCount,
          errorCount: errors.length,
          today: todayStr,
        },
        '今日日志清理完成',
      );

      return {
        success: true,
        clearedCount,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `今日日志清理完成，共清理 ${clearedCount} 个文件${errors.length > 0 ? `，${errors.length} 个文件清理失败` : ''}`,
      };
    } catch (error: any) {
      (req as any).log.error({ err: error }, '清理今日日志失败');
      return reply.code(500).send(buildPrefixedError('清理今日日志失败', error, 500));
    }
  });
}
