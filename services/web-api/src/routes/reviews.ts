import { withErrorLogging } from '@cuemate/logger';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { buildPrefixedError } from '../utils/error-response.js';
import { logOperation, OPERATION_MAPPING } from '../utils/operation-logger-helper.js';
import { OperationType } from '../utils/operation-logger.js';

export function registerReviewRoutes(app: FastifyInstance) {
  // =================== interviews 表 ===================
  // 字段含义：
  // - id: 面试记录唯一标识
  // - job_id: 关联的岗位ID (外键)
  // - user_id: 关联的用户ID (外键)
  // - language: 面试语言 ('zh'/'en')
  // - theme: 界面主题设置 ('light','dark','system')
  // - locale: 用户区域设置 (如 'zh-CN', 'en-US')
  // - timezone: 时区设置 (如 'Asia/Shanghai')
  // - started_at: 面试开始时间戳 (毫秒)
  // - ended_at: 面试结束时间戳 (毫秒, 可选)
  // - selected_model_id: 用户选择的AI模型ID
  // - job_title: 岗位标题 (快照数据)
  // - job_content: 岗位描述内容 (快照数据)
  // - question_count: 面试题目数量
  // - resumes_id: 关联简历ID
  // - resumes_title: 简历标题 (快照数据)
  // - resumes_content: 简历内容 (快照数据)
  // - duration: 面试持续时长 (秒)
  // - interview_type: 面试类型 ('mock'/'training')
  // - status: 面试状态 ('pending','active','completed','archived','deleted')
  // - message: 备注信息或报错信息

  // 面试复盘列表（按开始时间倒序，无分页，前端统一滚动展示）
  app.get(
    '/interviews',
    withErrorLogging(app.log as any, 'interviews.list', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();

        const totalRow = (app as any).db
          .prepare('SELECT COUNT(1) as cnt FROM interviews WHERE user_id=?')
          .get(payload.uid);
        const total = totalRow?.cnt ?? 0;

        const rows = (app as any).db
          .prepare(
            `SELECT i.id,
                  i.started_at,
                  i.ended_at,
                  i.selected_model_id,
                  i.job_title,
                  i.job_content,
                  i.question_count,
                  i.resumes_id,
                  i.resumes_title,
                  i.resumes_content,
                  i.duration,
                  i.interview_type,
                  i.status,
                  i.message,
                  j.title AS original_job_title,
                  s.total_score,
                  s.overall_summary,
                  s.pros AS overall_pros,
                  s.cons AS overall_cons,
                  s.suggestions AS overall_suggestions,
                  -- 取一条优点/缺点内容用于列表标签展示
                  (SELECT ia.content FROM interview_advantages ia WHERE ia.interview_id = i.id AND ia.type = 0 ORDER BY ia.created_at ASC LIMIT 1) AS advantage_content,
                  (SELECT ia.content FROM interview_advantages ia WHERE ia.interview_id = i.id AND ia.type = 1 ORDER BY ia.created_at ASC LIMIT 1) AS disadvantage_content,
                  -- 优/缺点条目总数
                  (SELECT COUNT(1) FROM interview_advantages ia WHERE ia.interview_id = i.id) AS advantages_total
             FROM interviews i
        LEFT JOIN jobs j ON j.id = i.job_id
        LEFT JOIN interview_scores s ON s.interview_id = i.id
            WHERE i.user_id = ?
            ORDER BY i.started_at DESC
            `,
          )
          .all(payload.uid);
        return { items: rows, total };
      } catch (err) {
        return reply.code(401).send(buildPrefixedError('获取面试复盘列表失败', err, 401));
      }
    }),
  );

  // 详情（概要、问题条目、面试官剖析）
  app.get(
    '/interviews/:id',
    withErrorLogging(app.log as any, 'interviews.detail', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const id = (req as any).params?.id as string;
        const own = (app as any).db
          .prepare(
            `SELECT id, job_id, started_at, ended_at, selected_model_id,
                    job_title, job_content, question_count, resumes_id,
                    resumes_title, resumes_content, duration, interview_type,
                    status, message
             FROM interviews WHERE id=? AND user_id=?`,
          )
          .get(id, payload.uid);
        if (!own) return reply.code(404).send({ error: '不存在或无权限' });

        const summary = (app as any).db
          .prepare(
            `SELECT s.total_score,
                  s.duration_sec,
                  s.num_questions,
                  s.overall_summary,
                  s.pros,
                  s.cons,
                  s.suggestions,
                  s.radar_interactivity,
                  s.radar_confidence,
                  s.radar_professionalism,
                  s.radar_relevance,
                  s.radar_clarity
             FROM interview_scores s WHERE s.interview_id=?`,
          )
          .get(id);

        // 问题条目（note_type='question'）
        const questions = (app as any).db
          .prepare(
            `SELECT r.id,
                  r.question_id,
                  r.question,
                  r.answer,
                  r.asked_question,
                  r.candidate_answer,
                  r.key_points,
                  r.assessment,
                  r.reference_answer,
                  r.pros,
                  r.cons,
                  r.suggestions,
                  r.created_at
             FROM interview_reviews r
        LEFT JOIN interviews i2 ON r.interview_id = i2.id
            WHERE r.interview_id=? AND r.note_type='question'
            ORDER BY r.created_at ASC`,
          )
          .all(id);

        const advantages = (app as any).db
          .prepare(
            `SELECT id, type, content, description, created_at
             FROM interview_advantages
            WHERE interview_id=?
            ORDER BY created_at ASC`,
          )
          .all(id);

        const insights = (app as any).db
          .prepare('SELECT * FROM interview_insights WHERE interview_id=?')
          .get(id);

        return { interview: own, summary, questions, insights, advantages };
      } catch (err) {
        return reply.code(401).send(buildPrefixedError('获取面试复盘详情失败', err, 401));
      }
    }),
  );

  // 创建一场面试（开始）——将当下用户的 selected_model_id 快照到 interviews.selected_model_id
  app.post(
    '/interviews',
    withErrorLogging(app.log as any, 'interviews.create', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const body = z.object({
          jobId: z.string().min(1),
          jobTitle: z.string().optional(),
          jobContent: z.string().optional(),
          questionCount: z.number().optional(),
          resumesId: z.string().optional(),
          resumesTitle: z.string().optional(),
          resumesContent: z.string().optional(),
          interviewType: z.enum(['mock', 'training']).default('mock'),
          status: z.enum(['pending', 'active', 'completed', 'archived', 'deleted']).optional(),
          message: z.string().optional()
        }).parse((req as any).body || {});

        const userRow = (app as any).db
          .prepare('SELECT selected_model_id, locale, theme, timezone FROM users WHERE id=?')
          .get(payload.uid);
        const { randomUUID } = await import('crypto');
        const id = randomUUID();
        const now = Date.now();
        const language = (userRow?.locale || 'zh-CN').startsWith('zh') ? 'zh' : 'en';
        const theme = userRow?.theme || 'system';

        (app as any).db
          .prepare(
            `INSERT INTO interviews (
              id, job_id, user_id, language, theme, started_at, ended_at,
              selected_model_id, theme, locale, timezone, job_title, job_content,
              question_count, resumes_id, resumes_title, resumes_content,
              duration, interview_type, status, message
            ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            id,
            body.jobId,
            payload.uid,
            language,
            theme,
            now,
            userRow?.selected_model_id || null,
            userRow?.theme || 'system',
            userRow?.locale || 'zh-CN',
            userRow?.timezone || 'Asia/Shanghai',
            body.jobTitle || null,
            body.jobContent || null,
            body.questionCount || 0,
            body.resumesId || null,
            body.resumesTitle || null,
            body.resumesContent || null,
            0, // duration初始化为0
            body.interviewType,
            body.status || 'active',
            body.message || null
          );
        
        // 记录操作日志
        await logOperation(app, req, {
          ...OPERATION_MAPPING.REVIEW,
          resourceId: id,
          resourceName: `面试复盘: ${body.jobId}`,
          operation: OperationType.CREATE,
          message: `创建面试复盘: ${body.jobId}`,
          status: 'success',
          userId: payload.uid
        });
        
        return { id };
      } catch (err: any) {
        return reply.code(400).send(buildPrefixedError('创建面试复盘失败', err, 400));
      }
    }),
  );

  // 更新面试信息
  app.put(
    '/interviews/:id',
    withErrorLogging(app.log as any, 'interviews.update', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const id = (req as any).params?.id as string;
        const body = z.object({
          jobTitle: z.string().optional(),
          jobContent: z.string().optional(),
          questionCount: z.number().optional(),
          resumesId: z.string().optional(),
          resumesTitle: z.string().optional(),
          resumesContent: z.string().optional(),
          duration: z.number().optional(),
          interviewType: z.enum(['mock', 'training']).optional(),
          status: z.enum(['pending', 'active', 'completed', 'archived', 'deleted']).optional(),
          message: z.string().optional()
        }).parse((req as any).body || {});

        const own = (app as any).db
          .prepare('SELECT id FROM interviews WHERE id=? AND user_id=?')
          .get(id, payload.uid);
        if (!own) return reply.code(404).send({ error: '不存在或无权限' });

        // 构建动态更新SQL
        const updateFields = [];
        const updateValues = [];

        if (body.jobTitle !== undefined) {
          updateFields.push('job_title = ?');
          updateValues.push(body.jobTitle);
        }
        if (body.jobContent !== undefined) {
          updateFields.push('job_content = ?');
          updateValues.push(body.jobContent);
        }
        if (body.questionCount !== undefined) {
          updateFields.push('question_count = ?');
          updateValues.push(body.questionCount);
        }
        if (body.resumesId !== undefined) {
          updateFields.push('resumes_id = ?');
          updateValues.push(body.resumesId);
        }
        if (body.resumesTitle !== undefined) {
          updateFields.push('resumes_title = ?');
          updateValues.push(body.resumesTitle);
        }
        if (body.resumesContent !== undefined) {
          updateFields.push('resumes_content = ?');
          updateValues.push(body.resumesContent);
        }
        if (body.duration !== undefined) {
          updateFields.push('duration = ?');
          updateValues.push(body.duration);
        }
        if (body.interviewType !== undefined) {
          updateFields.push('interview_type = ?');
          updateValues.push(body.interviewType);
        }
        if (body.status !== undefined) {
          updateFields.push('status = ?');
          updateValues.push(body.status);
        }
        if (body.message !== undefined) {
          updateFields.push('message = ?');
          updateValues.push(body.message);
        }

        if (updateFields.length > 0) {
          updateValues.push(id);
          (app as any).db
            .prepare(`UPDATE interviews SET ${updateFields.join(', ')} WHERE id = ?`)
            .run(...updateValues);
        }

        // 记录操作日志
        await logOperation(app, req, {
          ...OPERATION_MAPPING.REVIEW,
          resourceId: id,
          resourceName: `面试复盘: ${id}`,
          operation: OperationType.UPDATE,
          message: `更新面试信息: ${id}`,
          status: 'success',
          userId: payload.uid
        });

        return { success: true };
      } catch (err: any) {
        return reply.code(400).send(buildPrefixedError('更新面试信息失败', err, 400));
      }
    }),
  );

  // 结束一场面试（设置 ended_at）
  app.post(
    '/interviews/:id/end',
    withErrorLogging(app.log as any, 'interviews.end', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const id = (req as any).params?.id as string;
        const own = (app as any).db
          .prepare('SELECT id FROM interviews WHERE id=? AND user_id=?')
          .get(id, payload.uid);
        if (!own) return reply.code(404).send({ error: '不存在或无权限' });
        (app as any).db.prepare('UPDATE interviews SET ended_at=? WHERE id=?').run(Date.now(), id);
        
        // 记录操作日志
        await logOperation(app, req, {
          ...OPERATION_MAPPING.REVIEW,
          resourceId: id,
          resourceName: `面试复盘: ${id}`,
          operation: OperationType.UPDATE,
          message: `结束面试复盘: ${id}`,
          status: 'success',
          userId: payload.uid
        });
        
        return { success: true };
      } catch (err: any) {
        return reply.code(400).send(buildPrefixedError('结束面试失败', err, 400));
      }
    }),
  );

  // 删除整场面试（级联删除评分、复盘、题目、剖析）
  app.delete(
    '/interviews/:id',
    withErrorLogging(app.log as any, 'interviews.delete', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const id = (req as any).params?.id as string;
        const own = (app as any).db
          .prepare('SELECT id FROM interviews WHERE id=? AND user_id=?')
          .get(id, payload.uid);
        if (!own) return reply.code(404).send({ error: '不存在或无权限' });

        // 级联删除相关数据
        // 1. 删除面试复盘条目 (interview_reviews)
        (app as any).db.prepare('DELETE FROM interview_reviews WHERE interview_id=?').run(id);

        // 2. 删除面试评分 (interview_scores)
        (app as any).db.prepare('DELETE FROM interview_scores WHERE interview_id=?').run(id);

        // 3. 删除面试优缺点项 (interview_advantages)
        (app as any).db.prepare('DELETE FROM interview_advantages WHERE interview_id=?').run(id);

        // 4. 删除面试剖析 (interview_insights)
        (app as any).db.prepare('DELETE FROM interview_insights WHERE interview_id=?').run(id);

        // 5. 最后删除面试本身
        (app as any).db.prepare('DELETE FROM interviews WHERE id=?').run(id);
        
        // 记录操作日志
        await logOperation(app, req, {
          ...OPERATION_MAPPING.REVIEW,
          resourceId: id,
          resourceName: `面试复盘: ${id}`,
          operation: OperationType.DELETE,
          message: `删除面试复盘: ${id}`,
          status: 'success',
          userId: payload.uid
        });
        
        return { success: true };
      } catch (err) {
        return reply.code(401).send(buildPrefixedError('删除面试复盘失败', err, 401));
      }
    }),
  );
}
