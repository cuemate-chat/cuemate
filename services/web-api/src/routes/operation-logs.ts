import { withErrorLogging } from '@cuemate/logger';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { buildPrefixedError } from '../utils/error-response.js';

export function registerOperationLogRoutes(app: FastifyInstance) {
  // 获取操作记录列表（支持分页和筛选）
  app.get(
    '/operation-logs',
    withErrorLogging(app.log as any, 'operation-logs.list', async (req, reply) => {
      try {
        // JWT 验证，确保用户已登录
        await (req as any).jwtVerify();

        const query = (req as any).query || {};
        const {
          page = 1,
          pageSize = 20,
          menu,
          type,
          operation,
          status,
          userId,
          startTime,
          endTime,
          keyword,
        } = query;

        // 构建查询条件
        let sql = 'SELECT * FROM operation_logs WHERE 1=1';
        const args: any[] = [];

        if (menu) {
          sql += ' AND menu=?';
          args.push(menu);
        }

        if (type) {
          sql += ' AND type=?';
          args.push(type);
        }

        if (operation) {
          sql += ' AND operation=?';
          args.push(operation);
        }

        if (status) {
          sql += ' AND status=?';
          args.push(status);
        }

        if (userId) {
          sql += ' AND user_id=?';
          args.push(userId);
        }

        if (startTime) {
          sql += ' AND time>=?';
          args.push(Number(startTime));
        }

        if (endTime) {
          sql += ' AND time<=?';
          args.push(Number(endTime));
        }

        if (keyword) {
          sql += ' AND (message LIKE ? OR resource_name LIKE ? OR user_name LIKE ?)';
          const searchKeyword = `%${keyword}%`;
          args.push(searchKeyword, searchKeyword, searchKeyword);
        }

        // 计算总数
        const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
        const countResult = (app as any).db.prepare(countSql).get(...args);
        const total = countResult.total;

        // 分页查询
        sql += ' ORDER BY time DESC LIMIT ? OFFSET ?';
        args.push(Number(pageSize), (Number(page) - 1) * Number(pageSize));

        const list = (app as any).db.prepare(sql).all(...args);

        return {
          list,
          pagination: {
            page: Number(page),
            pageSize: Number(pageSize),
            total,
            totalPages: Math.ceil(total / Number(pageSize)),
          },
        };
      } catch (err) {
        return reply.code(500).send(buildPrefixedError('获取操作记录失败', err, 500));
      }
    }),
  );

  // 获取单个操作记录详情
  app.get(
    '/operation-logs/:id',
    withErrorLogging(app.log as any, 'operation-logs.detail', async (req, reply) => {
      try {
        // JWT 验证
        await (req as any).jwtVerify();

        const id = (req.params as any).id;
        const record = (app as any).db.prepare('SELECT * FROM operation_logs WHERE id=?').get(id);

        if (!record) {
          return reply.code(404).send({ error: '操作记录不存在' });
        }

        return { record };
      } catch (err) {
        return reply.code(500).send(buildPrefixedError('获取操作记录详情失败', err, 500));
      }
    }),
  );

  // 删除单个操作记录
  app.delete(
    '/operation-logs/:id',
    withErrorLogging(app.log as any, 'operation-logs.delete', async (req, reply) => {
      try {
        // JWT 验证
        await (req as any).jwtVerify();

        const id = (req.params as any).id;
        const result = (app as any).db.prepare('DELETE FROM operation_logs WHERE id=?').run(id);

        if (result.changes === 0) {
          return reply.code(404).send({ error: '操作记录不存在' });
        }

        return { success: true };
      } catch (err) {
        return reply.code(500).send(buildPrefixedError('删除操作记录失败', err, 500));
      }
    }),
  );

  // 批量删除操作记录（管理员权限）
  app.delete(
    '/operation-logs',
    withErrorLogging(app.log as any, 'operation-logs.batch-delete', async (req, reply) => {
      try {
        // JWT 验证
        const payload = await (req as any).jwtVerify();

        // 简单权限检查：这里可以根据实际需求添加更复杂的权限验证
        const user = (app as any).db.prepare('SELECT * FROM users WHERE id=?').get(payload.uid);

        if (!user) {
          return reply.code(404).send({ error: '用户不存在' });
        }

        const schema = z.object({
          ids: z.array(z.number()).optional(),
          beforeTime: z.number().optional(), // 删除指定时间之前的记录
          conditions: z
            .object({
              menu: z.string().optional(),
              type: z.string().optional(),
              status: z.string().optional(),
              userId: z.string().optional(),
            })
            .optional(),
        });

        const body = schema.parse((req as any).body || {});

        let deletedCount = 0;

        if (body.ids && body.ids.length > 0) {
          // 按 ID 批量删除
          const placeholders = body.ids.map(() => '?').join(',');
          const result = (app as any).db
            .prepare(`DELETE FROM operation_logs WHERE id IN (${placeholders})`)
            .run(...body.ids);
          deletedCount = result.changes;
        } else if (body.beforeTime) {
          // 删除指定时间之前的记录
          const result = (app as any).db
            .prepare('DELETE FROM operation_logs WHERE time < ?')
            .run(body.beforeTime);
          deletedCount = result.changes;
        } else if (body.conditions) {
          // 按条件删除
          let sql = 'DELETE FROM operation_logs WHERE 1=1';
          const args: any[] = [];

          if (body.conditions.menu) {
            sql += ' AND menu=?';
            args.push(body.conditions.menu);
          }

          if (body.conditions.type) {
            sql += ' AND type=?';
            args.push(body.conditions.type);
          }

          if (body.conditions.status) {
            sql += ' AND status=?';
            args.push(body.conditions.status);
          }

          if (body.conditions.userId) {
            sql += ' AND user_id=?';
            args.push(body.conditions.userId);
          }

          if (args.length > 0) {
            const result = (app as any).db.prepare(sql).run(...args);
            deletedCount = result.changes;
          }
        }

        return { success: true, deletedCount };
      } catch (err) {
        return reply.code(500).send(buildPrefixedError('批量删除操作记录失败', err, 500));
      }
    }),
  );

  // 获取操作统计信息（卡片：今日 00:00 起至当前；同时保留历史聚合）
  app.get(
    '/operation-logs/stats',
    withErrorLogging(app.log as any, 'operation-logs.stats', async (req, reply) => {
      try {
        // JWT 验证
        await (req as any).jwtVerify();

        const query = (req as any).query || {};
        const { days = 7 } = query; // 默认统计最近 7 天

        const daySeconds = 24 * 60 * 60;
        const startTime = Math.floor(Date.now() / 1000) - Number(days) * daySeconds;
        // 今日 00:00（本地时区）起始时间
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        const todayStart = Math.floor(d.getTime() / 1000);

        // 按菜单统计
        const menuStats = (app as any).db
          .prepare(
            `
            SELECT menu, COUNT(*) as count 
            FROM operation_logs 
            WHERE time >= ? 
            GROUP BY menu 
            ORDER BY count DESC
          `,
          )
          .all(startTime);

        // 按操作类型统计
        const operationStats = (app as any).db
          .prepare(
            `
            SELECT operation, COUNT(*) as count 
            FROM operation_logs 
            WHERE time >= ? 
            GROUP BY operation 
            ORDER BY count DESC
          `,
          )
          .all(startTime);

        // 按状态统计
        const statusStats = (app as any).db
          .prepare(
            `
            SELECT status, COUNT(*) as count 
            FROM operation_logs 
            WHERE time >= ? 
            GROUP BY status
          `,
          )
          .all(startTime);

        // 按天统计（历史趋势）
        const dailyStats = (app as any).db
          .prepare(
            `
            SELECT DATE(time, 'unixepoch', 'localtime') as date, COUNT(*) as count 
            FROM operation_logs 
            WHERE time >= ? 
            GROUP BY DATE(time, 'unixepoch', 'localtime') 
            ORDER BY date DESC
          `,
          )
          .all(startTime);

        // 最活跃用户
        const userStats = (app as any).db
          .prepare(
            `
            SELECT user_id, user_name, COUNT(*) as count 
            FROM operation_logs 
            WHERE time >= ? AND user_id IS NOT NULL
            GROUP BY user_id, user_name 
            ORDER BY count DESC 
            LIMIT 10
          `,
          )
          .all(startTime);

        // 今日指标与全量指标
        // 今日操作总数（从今天 00:00 起）
        const todayTotal =
          (app as any).db
            .prepare(`SELECT COUNT(*) as count FROM operation_logs WHERE time >= ?`)
            .get(todayStart)?.count || 0;

        // 成功/失败操作数为全量统计（不限定时间）
        const todaySuccess =
          (app as any).db
            .prepare(`SELECT COUNT(*) as count FROM operation_logs WHERE status = 'success'`)
            .get()?.count || 0;

        const todayFailed =
          (app as any).db
            .prepare(`SELECT COUNT(*) as count FROM operation_logs WHERE status = 'failed'`)
            .get()?.count || 0;

        const interviewCount = (app as any).db
          .prepare(
            `
            SELECT COUNT(*) as count 
            FROM interviews 
            WHERE started_at >= ?
          `,
          )
          .get(todayStart);

        return {
          menuStats,
          operationStats,
          statusStats,
          dailyStats,
          userStats,
          interviewCount: interviewCount?.count || 0,
          todayTotal,
          todaySuccess,
          todayFailed,
        };
      } catch (err) {
        return reply.code(500).send(buildPrefixedError('获取操作统计失败', err, 500));
      }
    }),
  );

  // 导出操作记录（CSV 格式）
  app.get(
    '/operation-logs/export',
    withErrorLogging(app.log as any, 'operation-logs.export', async (req, reply) => {
      try {
        // JWT 验证
        await (req as any).jwtVerify();

        const query = (req as any).query || {};
        const { startTime, endTime, format = 'csv' } = query;

        let sql = 'SELECT * FROM operation_logs WHERE 1=1';
        const args: any[] = [];

        if (startTime) {
          sql += ' AND time>=?';
          args.push(Number(startTime));
        }

        if (endTime) {
          sql += ' AND time<=?';
          args.push(Number(endTime));
        }

        sql += ' ORDER BY time DESC LIMIT 10000'; // 限制导出数量

        const records = (app as any).db.prepare(sql).all(...args);

        if (format === 'csv') {
          // 生成 CSV 格式
          const headers = [
            'ID',
            '操作菜单',
            '资源类型',
            '资源 ID',
            '资源名称',
            '操作类型',
            '操作时间',
            '操作信息',
            '来源 IP',
            '用户 ID',
            '用户名',
            '请求方法',
            '请求 URL',
            '状态',
            '错误信息',
            '创建时间',
            '更新时间',
          ];

          const csvLines = [headers.join(',')];

          for (const record of records) {
            const line = [
              record.id,
              record.menu || '',
              record.type || '',
              record.resource_id || '',
              record.resource_name || '',
              record.operation || '',
              new Date(record.time * 1000).toLocaleString('zh-CN'),
              record.message || '',
              record.source_ip || '',
              record.user_id || '',
              record.user_name || '',
              record.request_method || '',
              record.request_url || '',
              record.status || '',
              record.error_message || '',
              new Date(record.created_at * 1000).toLocaleString('zh-CN'),
              new Date(record.updated_at * 1000).toLocaleString('zh-CN'),
            ].map((field) => `"${String(field).replace(/"/g, '""')}"`);

            csvLines.push(line.join(','));
          }

          const csv = csvLines.join('\n');
          const filename = `operation_logs_${new Date().toISOString().slice(0, 10)}.csv`;

          reply.header('Content-Type', 'text/csv; charset=utf-8');
          reply.header('Content-Disposition', `attachment; filename="${filename}"`);
          return '\ufeff' + csv; // 添加 BOM 以支持中文
        }

        return { records };
      } catch (err) {
        return reply.code(500).send(buildPrefixedError('导出操作记录失败', err, 500));
      }
    }),
  );
}
