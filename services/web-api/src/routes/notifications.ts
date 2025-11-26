import { withErrorLogging } from '@cuemate/logger';
import type { FastifyInstance } from 'fastify';
import { logger } from '../utils/logger.js';
import { buildPrefixedError } from '../utils/error-response.js';
import {
  notifyAdExpiring,
  notifyLicenseExpired,
  notifyLicenseExpiring,
} from '../utils/notification-helper.js';
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
        const {
          type,
          is_read,
          category,
          priority,
          is_starred,
          keyword,
          start_date,
          end_date,
          limit = '20',
          offset = '0',
        } = request.query as any;

        // 在返回通知列表之前,先检查并创建到期提醒通知
        await checkAndCreateExpiringNotifications(db, userId);

        // 构建查询条件
        let whereClause = 'WHERE user_id = ?';
        const params: any[] = [userId];

        // 按类型筛选
        if (type) {
          whereClause += ' AND type = ?';
          params.push(type);
        }

        // 按分类筛选
        if (category) {
          if (category === 'other') {
            // "其他"类别：排除主要类别
            whereClause += ' AND category NOT IN (?, ?, ?, ?, ?)';
            params.push('job', 'question', 'interview', 'knowledge', 'license');
          } else {
            whereClause += ' AND category = ?';
            params.push(category);
          }
        }

        // 按优先级筛选
        if (priority) {
          whereClause += ' AND priority = ?';
          params.push(priority);
        }

        // 按已读状态筛选
        if (is_read !== undefined) {
          whereClause += ' AND is_read = ?';
          params.push(is_read === 'true' ? 1 : 0);
        }

        // 按星标状态筛选
        if (is_starred !== undefined) {
          whereClause += ' AND is_starred = ?';
          params.push(is_starred === 'true' ? 1 : 0);
        }

        // 按关键词搜索
        if (keyword) {
          whereClause += ' AND (title LIKE ? OR content LIKE ?)';
          const keywordPattern = `%${keyword}%`;
          params.push(keywordPattern, keywordPattern);
        }

        // 按时间段筛选
        if (start_date) {
          whereClause += ' AND created_at >= ?';
          params.push(parseInt(start_date));
        }
        if (end_date) {
          whereClause += ' AND created_at <= ?';
          params.push(parseInt(end_date));
        }

        // 获取总数（用于分页）
        const countQuery = `SELECT COUNT(*) as count FROM user_notifications ${whereClause}`;
        const totalResult = db.prepare(countQuery).get(...params) as { count: number };

        // 获取分页数据（需要重新构建 params 数组，因为上面已经用过了）
        const dataParams = [...params, parseInt(limit), parseInt(offset)];
        const dataQuery = `
          SELECT * FROM user_notifications
          ${whereClause}
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `;
        const notifications = db.prepare(dataQuery).all(...dataParams);

        // 获取未读数量
        const unreadCount = db
          .prepare(
            'SELECT COUNT(*) as count FROM user_notifications WHERE user_id = ? AND is_read = 0',
          )
          .get(userId) as { count: number };

        // 获取各类别统计（基于全部通知，不受筛选条件影响）
        const categoryStats = db
          .prepare(
            `
            SELECT category, COUNT(*) as count
            FROM user_notifications
            WHERE user_id = ?
            GROUP BY category
          `,
          )
          .all(userId) as Array<{ category: string; count: number }>;

        // 获取各 Tab 统计（基于全部通知）
        const allCount = db
          .prepare('SELECT COUNT(*) as count FROM user_notifications WHERE user_id = ?')
          .get(userId) as { count: number };
        const readCount = db
          .prepare(
            'SELECT COUNT(*) as count FROM user_notifications WHERE user_id = ? AND is_read = 1',
          )
          .get(userId) as { count: number };
        const starredCount = db
          .prepare(
            'SELECT COUNT(*) as count FROM user_notifications WHERE user_id = ? AND is_starred = 1',
          )
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
          total: totalResult.count,
          categoryStats: categoryStats.reduce(
            (acc, item) => {
              acc[item.category] = item.count;
              return acc;
            },
            {} as Record<string, number>,
          ),
          tabCounts: {
            all: allCount.count,
            unread: unreadCount.count,
            read: readCount.count,
            starred: starredCount.count,
          },
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
          .prepare(
            'SELECT COUNT(*) as count FROM user_notifications WHERE user_id = ? AND is_read = 0',
          )
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
          return reply
            .status(404)
            .send(buildPrefixedError('通知不存在', new Error('Notification not found'), 404));
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
          .prepare(
            'UPDATE user_notifications SET is_read = 1, read_at = ? WHERE user_id = ? AND is_read = 0',
          )
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
          return reply
            .status(404)
            .send(buildPrefixedError('通知不存在', new Error('Notification not found'), 404));
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

  // 删除通知
  app.delete(
    '/api/notifications/:id',
    withErrorLogging(app.log as any, 'notifications.delete', async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const result = db.prepare('DELETE FROM user_notifications WHERE id = ?').run(id);

        if (result.changes === 0) {
          return reply
            .status(404)
            .send(buildPrefixedError('通知不存在', new Error('Notification not found'), 404));
        }

        await logOperation(app, request, {
          ...OPERATION_MAPPING.SYSTEM,
          resourceId: id,
          resourceName: '通知',
          operation: OperationType.DELETE,
          message: `删除通知 ${id}`,
          status: 'success',
        });

        return reply.send({ success: true });
      } catch (error) {
        app.log.error({ err: error }, 'Failed to delete notification');
        return reply.status(500).send(buildPrefixedError('删除通知失败', error as Error, 500));
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
          return reply
            .status(400)
            .send(buildPrefixedError('缺少必要参数', new Error('Missing required fields'), 400));
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

/**
 * 检查并创建即将到期的通知
 * 包括许可证到期和广告到期提醒
 *
 * 逻辑:
 * 1. 即将到期(30 天内/7 天内): 每 24 小时发送一次提醒
 * 2. 已经过期: 每天发送一次提醒,直到用户续费或删除
 */
async function checkAndCreateExpiringNotifications(db: any, _userId: string) {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // 1. 检查许可证
  try {
    // 1.1 检查即将到期的许可证 (30 天内到期,但还没过期)
    const expiringLicenses = db
      .prepare(
        `
        SELECT id, edition, expire_time, apply_user
        FROM licenses
        WHERE status = 'active'
        AND expire_time > ?
        AND expire_time <= ?
      `,
      )
      .all(now, now + 30 * dayMs);

    for (const license of expiringLicenses) {
      const daysRemaining = Math.floor((license.expire_time - now) / dayMs);

      // 检查 24 小时内是否已经创建过通知
      const existingNotification = db
        .prepare(
          `
          SELECT id FROM user_notifications
          WHERE user_id = ?
          AND type = 'license_expire'
          AND resource_id = ?
          AND created_at > ?
        `,
        )
        .get(license.apply_user, license.id, now - dayMs);

      if (!existingNotification) {
        notifyLicenseExpiring(db, license.apply_user, {
          id: license.id,
          type: license.edition,
          expireAt: license.expire_time,
          daysLeft: daysRemaining,
        });
      }
    }

    // 1.2 检查已经过期的许可证 (每天发送提醒)
    const expiredLicenses = db
      .prepare(
        `
        SELECT id, edition, expire_time, apply_user
        FROM licenses
        WHERE status = 'active'
        AND expire_time <= ?
      `,
      )
      .all(now);

    for (const license of expiredLicenses) {
      // 检查 24 小时内是否已经创建过通知
      const existingNotification = db
        .prepare(
          `
          SELECT id FROM user_notifications
          WHERE user_id = ?
          AND type = 'license_expire'
          AND resource_id = ?
          AND created_at > ?
        `,
        )
        .get(license.apply_user, license.id, now - dayMs);

      if (!existingNotification) {
        notifyLicenseExpired(db, license.apply_user, {
          id: license.id,
          type: license.edition,
          expiredAt: license.expire_time,
        });
      }
    }
  } catch (error) {
    logger.error({ err: error }, '检查许可证到期失败');
  }

  // 2. 检查广告
  try {
    // 2.1 检查即将到期的广告 (7 天内到期,但还没过期)
    const expiringAds = db
      .prepare(
        `
        SELECT id, title, expires_at, user_id
        FROM pixel_ads
        WHERE status = 'active'
        AND expires_at > ?
        AND expires_at <= ?
      `,
      )
      .all(now, now + 7 * dayMs);

    for (const ad of expiringAds) {
      const daysRemaining = Math.floor((ad.expires_at - now) / dayMs);

      // 检查 24 小时内是否已经创建过通知
      const existingNotification = db
        .prepare(
          `
          SELECT id FROM user_notifications
          WHERE user_id = ?
          AND type = 'ad_expire'
          AND resource_id = ?
          AND created_at > ?
        `,
        )
        .get(ad.user_id, ad.id, now - dayMs);

      if (!existingNotification) {
        notifyAdExpiring(db, ad.user_id, {
          id: ad.id,
          title: ad.title,
          expireAt: ad.expires_at,
          daysLeft: daysRemaining,
        });
      }
    }

    // 2.2 检查已经过期的广告 (过期的广告直接下线,不再发送通知,只标记状态为 expired)
    const expiredAds = db
      .prepare(
        `
        SELECT id
        FROM pixel_ads
        WHERE status = 'active'
        AND expires_at <= ?
      `,
      )
      .all(now);

    for (const ad of expiredAds) {
      // 自动下线过期广告
      db.prepare('UPDATE pixel_ads SET status = ? WHERE id = ?').run('expired', ad.id);
    }
  } catch (error) {
    logger.error({ err: error }, '检查广告到期失败');
  }
}
