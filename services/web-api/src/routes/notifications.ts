import type { FastifyInstance } from 'fastify';
import { withErrorLogging } from '@cuemate/logger';
import { buildPrefixedError } from '../utils/error-response.js';
import { logOperation, OPERATION_MAPPING } from '../utils/operation-logger-helper.js';
import { OperationType } from '../utils/operation-logger.js';

/**
 * 通知类型说明：
 * - type: 通知类型，常用值包括但不限于：
 *   - job_created: 新建岗位
 *   - question_created: 新建面试押题
 *   - interview_report: 面试报告生成完毕
 *   - knowledge_synced: 同步向量知识库
 *   - model_added: 新增模型
 *   - license_imported: 导入许可证
 *   - license_expire: 许可证到期
 *   - ad_expire: 像素广告到期
 *   - task_success: 任务成功
 *   - task_failed: 任务失败
 *
 * - category: 业务分类，常用值包括但不限于：
 *   - job: 岗位管理
 *   - question: 面试押题
 *   - interview: 面试相关
 *   - knowledge: 知识库
 *   - model: 模型管理
 *   - license: 许可证
 *   - ad: 广告管理
 *   - system: 系统通知
 *
 * 注意：type 和 category 字段不限制具体值，可根据业务需求自由扩展
 */

export function registerNotificationRoutes(app: FastifyInstance) {
  const db = (app as any).db;

  // 获取用户通知列表
  app.get(
    '/api/notifications',
    withErrorLogging(app.log as any, 'notifications.list', async (request, reply) => {
      try {
        const payload = await (request as any).jwtVerify();
        const userId = payload.uid;
        const { type, is_read, limit = '20', offset = '0' } = request.query as any;

        let query = `
          SELECT * FROM user_notifications
          WHERE user_id = ?
        `;
        const params: any[] = [userId];

        // 按类型筛选
        if (type) {
          query += ' AND type = ?';
          params.push(type);
        }

        // 按已读状态筛选
        if (is_read !== undefined) {
          query += ' AND is_read = ?';
          params.push(is_read === 'true' ? 1 : 0);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const notifications = db.prepare(query).all(...params);

        // 获取未读数量
        const unreadCount = db
          .prepare('SELECT COUNT(*) as count FROM user_notifications WHERE user_id = ? AND is_read = 0')
          .get(userId) as { count: number };

        // 记录操作日志
        await logOperation(app, request, {
          ...OPERATION_MAPPING.SYSTEM,
          resourceId: `notifications-${userId}`,
          resourceName: '用户通知列表',
          operation: OperationType.VIEW,
          message: `查询用户通知列表，共 ${notifications.length} 条`,
          status: 'success',
        });

        return reply.send({
          notifications,
          unreadCount: unreadCount.count,
          total: notifications.length,
        });
      } catch (error) {
        app.log.error({ err: error }, 'Failed to fetch notifications');

        await logOperation(app, request, {
          ...OPERATION_MAPPING.SYSTEM,
          resourceId: 'notifications',
          resourceName: '用户通知列表',
          operation: OperationType.VIEW,
          message: `查询通知列表失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
          status: 'failed',
        });

        return reply.status(500).send(buildPrefixedError('获取通知列表失败', error as Error, 500));
      }
    }),
  );

  // 获取未读通知数量
  app.get(
    '/api/notifications/unread-count',
    withErrorLogging(app.log as any, 'notifications.unreadCount', async (request, reply) => {
      try {
        const payload = await (request as any).jwtVerify();
        const userId = payload.uid;

        const result = db
          .prepare('SELECT COUNT(*) as count FROM user_notifications WHERE user_id = ? AND is_read = 0')
          .get(userId) as { count: number };

        return reply.send({ count: result.count });
      } catch (error) {
        app.log.error({ err: error }, 'Failed to get unread count');
        return reply.status(500).send(buildPrefixedError('获取未读数量失败', error as Error, 500));
      }
    }),
  );

  // 标记通知为已读
  app.put(
    '/api/notifications/:id/read',
    withErrorLogging(app.log as any, 'notifications.markRead', async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const result = db
          .prepare('UPDATE user_notifications SET is_read = 1, read_at = ? WHERE id = ?')
          .run(Date.now(), id);

        if (result.changes === 0) {
          return reply.status(404).send(buildPrefixedError('通知不存在', new Error('Notification not found'), 404));
        }

        await logOperation(app, request, {
          ...OPERATION_MAPPING.SYSTEM,
          resourceId: id,
          resourceName: '通知',
          operation: OperationType.UPDATE,
          message: `标记通知 ${id} 为已读`,
          status: 'success',
        });

        return reply.send({ success: true });
      } catch (error) {
        app.log.error({ err: error }, 'Failed to mark notification as read');
        return reply.status(500).send(buildPrefixedError('标记已读失败', error as Error, 500));
      }
    }),
  );

  // 标记所有通知为已读
  app.put(
    '/api/notifications/read-all',
    withErrorLogging(app.log as any, 'notifications.markAllRead', async (request, reply) => {
      try {
        const payload = await (request as any).jwtVerify();
        const userId = payload.uid;

        const result = db
          .prepare('UPDATE user_notifications SET is_read = 1, read_at = ? WHERE user_id = ? AND is_read = 0')
          .run(Date.now(), userId);

        await logOperation(app, request, {
          ...OPERATION_MAPPING.SYSTEM,
          resourceId: `notifications-${userId}`,
          resourceName: '全部通知',
          operation: OperationType.UPDATE,
          message: `标记 ${result.changes} 条通知为已读`,
          status: 'success',
        });

        return reply.send({ success: true, count: result.changes });
      } catch (error) {
        app.log.error({ err: error }, 'Failed to mark all notifications as read');
        return reply.status(500).send(buildPrefixedError('标记全部已读失败', error as Error, 500));
      }
    }),
  );

  // 标记通知为星标
  app.put(
    '/api/notifications/:id/star',
    withErrorLogging(app.log as any, 'notifications.toggleStar', async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { starred } = request.body as { starred: boolean };

        const result = db
          .prepare('UPDATE user_notifications SET is_starred = ?, starred_at = ? WHERE id = ?')
          .run(starred ? 1 : 0, starred ? Date.now() : null, id);

        if (result.changes === 0) {
          return reply.status(404).send(buildPrefixedError('通知不存在', new Error('Notification not found'), 404));
        }

        await logOperation(app, request, {
          ...OPERATION_MAPPING.SYSTEM,
          resourceId: id,
          resourceName: '通知',
          operation: OperationType.UPDATE,
          message: `${starred ? '标记' : '取消'}通知 ${id} 为星标`,
          status: 'success',
        });

        return reply.send({ success: true });
      } catch (error) {
        app.log.error({ err: error }, 'Failed to toggle star');
        return reply.status(500).send(buildPrefixedError('操作失败', error as Error, 500));
      }
    }),
  );

  // 创建通知
  app.post(
    '/api/notifications',
    withErrorLogging(app.log as any, 'notifications.create', async (request, reply) => {
      try {
        const {
          userId,
          title,
          content,
          summary,
          type,
          category,
          priority = 'normal',
          resourceType,
          resourceId,
          actionUrl,
          actionText,
          metadata,
          expireAt,
        } = request.body as any;

        if (!userId || !title || !content || !type || !category) {
          return reply.status(400).send(buildPrefixedError('缺少必要参数', new Error('Missing required fields'), 400));
        }

        const result = db
          .prepare(
            `
          INSERT INTO user_notifications (
            user_id, title, content, summary, type, category, priority,
            resource_type, resource_id, action_url, action_text, metadata, expire_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          )
          .run(
            userId,
            title,
            content,
            summary || null,
            type,
            category,
            priority,
            resourceType || null,
            resourceId || null,
            actionUrl || null,
            actionText || null,
            metadata ? JSON.stringify(metadata) : null,
            expireAt || null,
            Date.now(),
          );

        await logOperation(app, request, {
          ...OPERATION_MAPPING.SYSTEM,
          resourceId: result.lastInsertRowid.toString(),
          resourceName: '通知',
          operation: OperationType.CREATE,
          message: `创建通知: ${title}`,
          status: 'success',
        });

        return reply.send({
          success: true,
          id: result.lastInsertRowid,
        });
      } catch (error) {
        app.log.error({ err: error }, 'Failed to create notification');
        return reply.status(500).send(buildPrefixedError('创建通知失败', error as Error, 500));
      }
    }),
  );
}
