import { withErrorLogging } from '@cuemate/logger';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { buildPrefixedError } from '../utils/error-response.js';
import { logOperation, OPERATION_MAPPING } from '../utils/operation-logger-helper.js';
import { OperationType } from '../utils/operation-logger.js';
import { notifyInterviewReportReady } from '../utils/notification-helper.js';

export function registerInterviewRoutes(app: FastifyInstance) {
  // =================== interview_scores 表 ===================
  // 字段含义：
  // - id: 评分记录唯一标识
  // - interview_id: 关联的面试 ID (外键, UNIQUE)
  // - total_score: 综合评分 (0-100 分)
  // - duration_sec: 面试持续时间(秒)
  // - num_questions: 面试问题数量
  // - overall_summary: 整体总结文本
  // - pros: 整体优点评价
  // - cons: 整体缺点评价
  // - suggestions: 整体改进建议
  // - radar_*: 5 维雷达评分 (0-100 分)
  //   * radar_interactivity: 互动性评分
  //   * radar_confidence: 自信度评分
  //   * radar_professionalism: 专业性评分
  //   * radar_relevance: 回答相关性评分
  //   * radar_clarity: 表达流畅性评分
  // - created_at: 创建时间戳 (毫秒)

  // 创建面试评分记录
  app.post(
    '/interview-scores',
    withErrorLogging(app.log as any, 'interview-scores.create', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const body = z
          .object({
            interview_id: z.string().min(1),
            total_score: z.number().min(0).max(100),
            duration_sec: z.number().min(0),
            num_questions: z.number().min(0),
            overall_summary: z.string().optional(),
            pros: z.string().optional(),
            cons: z.string().optional(),
            suggestions: z.string().optional(),
            radar_interactivity: z.number().min(0).max(100).default(0),
            radar_confidence: z.number().min(0).max(100).default(0),
            radar_professionalism: z.number().min(0).max(100).default(0),
            radar_relevance: z.number().min(0).max(100).default(0),
            radar_clarity: z.number().min(0).max(100).default(0),
          })
          .parse((req as any).body || {});

        // 验证面试是否存在且属于当前用户
        const interview = (app as any).db
          .prepare('SELECT id FROM interviews WHERE id=? AND user_id=?')
          .get(body.interview_id, payload.uid);
        if (!interview) return reply.code(404).send({ error: '面试不存在或无权限' });

        const { randomUUID } = await import('crypto');
        const id = randomUUID();
        const now = Date.now();

        (app as any).db
          .prepare(
            `INSERT INTO interview_scores (
              id, interview_id, total_score, duration_sec, num_questions,
              overall_summary, pros, cons, suggestions, radar_interactivity,
              radar_confidence, radar_professionalism, radar_relevance,
              radar_clarity, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            id,
            body.interview_id,
            body.total_score,
            body.duration_sec,
            body.num_questions,
            body.overall_summary || null,
            body.pros || null,
            body.cons || null,
            body.suggestions || null,
            body.radar_interactivity,
            body.radar_confidence,
            body.radar_professionalism,
            body.radar_relevance,
            body.radar_clarity,
            now,
          );

        // 记录操作日志
        await logOperation(app, req, {
          ...OPERATION_MAPPING.REVIEW,
          resourceId: id,
          resourceName: `面试评分: ${body.interview_id}`,
          operation: OperationType.CREATE,
          message: `创建面试评分: ${body.interview_id}`,
          status: 'success',
          userId: payload.uid,
        });

        // 发送面试报告生成通知
        try {
          // 获取面试信息（岗位名称、面试时间、时长）
          const interviewInfo = (app as any).db
            .prepare('SELECT job_title, started_at, duration FROM interviews WHERE id = ?')
            .get(body.interview_id);

          if (interviewInfo) {
            notifyInterviewReportReady(
              (app as any).db,
              payload.uid,
              body.interview_id,
              interviewInfo.job_title || '未命名岗位',
              interviewInfo.started_at,
              interviewInfo.duration
            );
          }
        } catch (notifyError) {
          app.log.error({ err: notifyError }, '发送面试报告通知失败');
        }

        return { id };
      } catch (err: any) {
        app.log.error({ err, endpoint: 'POST /interview-scores' }, '创建面试评分失败');
        return reply.code(400).send(buildPrefixedError('创建面试评分失败', err, 400));
      }
    }),
  );

  // 更新面试评分记录
  app.put(
    '/interview-scores/:id',
    withErrorLogging(app.log as any, 'interview-scores.update', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const id = (req as any).params?.id as string;
        const body = z
          .object({
            total_score: z.number().min(0).max(100).optional(),
            duration_sec: z.number().min(0).optional(),
            num_questions: z.number().min(0).optional(),
            overall_summary: z.string().optional(),
            pros: z.string().optional(),
            cons: z.string().optional(),
            suggestions: z.string().optional(),
            radar_interactivity: z.number().min(0).max(100).optional(),
            radar_confidence: z.number().min(0).max(100).optional(),
            radar_professionalism: z.number().min(0).max(100).optional(),
            radar_relevance: z.number().min(0).max(100).optional(),
            radar_clarity: z.number().min(0).max(100).optional(),
          })
          .parse((req as any).body || {});

        // 验证评分记录是否存在且属于当前用户
        const scoreRecord = (app as any).db
          .prepare(
            `
            SELECT s.id FROM interview_scores s
            JOIN interviews i ON s.interview_id = i.id
            WHERE s.id=? AND i.user_id=?
          `,
          )
          .get(id, payload.uid);
        if (!scoreRecord) return reply.code(404).send({ error: '评分记录不存在或无权限' });

        // 构建动态更新 SQL
        const updateFields = [];
        const updateValues = [];

        if (body.total_score !== undefined) {
          updateFields.push('total_score = ?');
          updateValues.push(body.total_score);
        }
        if (body.duration_sec !== undefined) {
          updateFields.push('duration_sec = ?');
          updateValues.push(body.duration_sec);
        }
        if (body.num_questions !== undefined) {
          updateFields.push('num_questions = ?');
          updateValues.push(body.num_questions);
        }
        if (body.overall_summary !== undefined) {
          updateFields.push('overall_summary = ?');
          updateValues.push(body.overall_summary);
        }
        if (body.pros !== undefined) {
          updateFields.push('pros = ?');
          updateValues.push(body.pros);
        }
        if (body.cons !== undefined) {
          updateFields.push('cons = ?');
          updateValues.push(body.cons);
        }
        if (body.suggestions !== undefined) {
          updateFields.push('suggestions = ?');
          updateValues.push(body.suggestions);
        }
        if (body.radar_interactivity !== undefined) {
          updateFields.push('radar_interactivity = ?');
          updateValues.push(body.radar_interactivity);
        }
        if (body.radar_confidence !== undefined) {
          updateFields.push('radar_confidence = ?');
          updateValues.push(body.radar_confidence);
        }
        if (body.radar_professionalism !== undefined) {
          updateFields.push('radar_professionalism = ?');
          updateValues.push(body.radar_professionalism);
        }
        if (body.radar_relevance !== undefined) {
          updateFields.push('radar_relevance = ?');
          updateValues.push(body.radar_relevance);
        }
        if (body.radar_clarity !== undefined) {
          updateFields.push('radar_clarity = ?');
          updateValues.push(body.radar_clarity);
        }

        if (updateFields.length > 0) {
          updateValues.push(id);
          (app as any).db
            .prepare(`UPDATE interview_scores SET ${updateFields.join(', ')} WHERE id = ?`)
            .run(...updateValues);
        }

        // 记录操作日志
        await logOperation(app, req, {
          ...OPERATION_MAPPING.REVIEW,
          resourceId: id,
          resourceName: `面试评分: ${id}`,
          operation: OperationType.UPDATE,
          message: `更新面试评分: ${id}`,
          status: 'success',
          userId: payload.uid,
        });

        return { success: true };
      } catch (err: any) {
        app.log.error({ err, endpoint: 'PUT /interview-scores/:id' }, '更新面试评分失败');
        return reply.code(400).send(buildPrefixedError('更新面试评分失败', err, 400));
      }
    }),
  );

  // =================== interview_reviews 表 ===================
  // 字段含义：
  // - id: 复盘条目唯一标识
  // - interview_id: 关联的面试 ID (外键)
  // - note_type: 条目类型 (实际使用: 'interview_qa','summary' 等)
  // - content: 主要内容文本
  // - question_id: 关联的面试题 ID (可选)
  // - question: 备份的问题文本
  // - answer: 备份的答案文本
  // - asked_question: 实际提问的问题文本
  // - candidate_answer: 候选人实际回答内容
  // - pros: 这个问题回答的优点
  // - cons: 这个问题回答的缺点
  // - suggestions: 这个问题的改进建议
  // - key_points: 这个问题的考察点
  // - assessment: 对这个问题回答的评价
  // - reference_answer: 这个问题的参考答案
  // - other_id: 关联的其他资源 ID (可选)
  // - other_content: 其他扩展内容 (可选)
  // - created_at: 创建时间戳 (毫秒)
  // - end_at: 问题结束时间戳 (毫秒)
  // - duration: 问题回答时长 (秒)

  // 创建面试复盘条目
  app.post(
    '/interview-reviews',
    withErrorLogging(app.log as any, 'interview-reviews.create', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const body = z
          .object({
            interview_id: z.string().min(1),
            note_type: z.string().default('question'),
            content: z.string().min(1),
            question_id: z.string().optional(),
            question: z.string().optional(),
            answer: z.string().optional(),
            asked_question: z.string().optional(),
            candidate_answer: z.string().optional(),
            pros: z.string().optional(),
            cons: z.string().optional(),
            suggestions: z.string().optional(),
            key_points: z.string().optional(),
            assessment: z.string().optional(),
            reference_answer: z.string().optional(),
            other_id: z.string().optional(),
            other_content: z.string().optional(),
            end_at: z.number().optional(),
            duration: z.number().optional(),
          })
          .parse((req as any).body || {});

        // 验证面试是否存在且属于当前用户
        const interview = (app as any).db
          .prepare('SELECT id FROM interviews WHERE id=? AND user_id=?')
          .get(body.interview_id, payload.uid);
        if (!interview) return reply.code(404).send({ error: '面试不存在或无权限' });

        const { randomUUID } = await import('crypto');
        const id = randomUUID();
        const now = Date.now();

        (app as any).db
          .prepare(
            `INSERT INTO interview_reviews (
              id, interview_id, note_type, content, question_id, question,
              answer, asked_question, candidate_answer, pros, cons,
              suggestions, key_points, assessment, reference_answer, other_id, other_content, created_at, end_at, duration
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            id,
            body.interview_id,
            body.note_type,
            body.content,
            body.question_id || null,
            body.question || null,
            body.answer || null,
            body.asked_question || null,
            body.candidate_answer || null,
            body.pros || null,
            body.cons || null,
            body.suggestions || null,
            body.key_points || null,
            body.assessment || null,
            body.reference_answer || null,
            body.other_id || null,
            body.other_content || null,
            now,
            body.end_at || null,
            body.duration || null,
          );

        // 记录操作日志
        await logOperation(app, req, {
          ...OPERATION_MAPPING.REVIEW,
          resourceId: id,
          resourceName: `面试复盘条目: ${body.interview_id}`,
          operation: OperationType.CREATE,
          message: `创建面试复盘条目: ${body.interview_id}`,
          status: 'success',
          userId: payload.uid,
        });

        return { id };
      } catch (err: any) {
        app.log.error({ err, endpoint: 'POST /interview-reviews' }, '创建面试复盘条目失败');
        return reply.code(400).send(buildPrefixedError('创建面试复盘条目失败', err, 400));
      }
    }),
  );

  // 查询面试复盘条目列表
  app.get(
    '/interview-reviews',
    withErrorLogging(app.log as any, 'interview-reviews.list', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const query = z
          .object({
            interview_id: z.string().optional(),
            note_type: z.enum(['mock', 'training']).optional(),
            page: z.string().optional().default('1'),
            limit: z.string().optional().default('50'),
          })
          .parse((req as any).query || {});

        const page = parseInt(query.page);
        const limit = parseInt(query.limit);
        const offset = (page - 1) * limit;

        // 构建基础查询
        let whereClause = 'WHERE i.user_id = ?';
        const params = [payload.uid];

        if (query.interview_id) {
          whereClause += ' AND r.interview_id = ?';
          params.push(query.interview_id);
        }

        if (query.note_type) {
          whereClause += ' AND r.note_type = ?';
          params.push(query.note_type);
        }

        // 查询总数
        const countQuery = `
          SELECT COUNT(*) as count
          FROM interview_reviews r
          JOIN interviews i ON r.interview_id = i.id
          ${whereClause}
        `;
        const countResult = (app as any).db.prepare(countQuery).get(...params);
        const total = countResult?.count || 0;

        // 查询数据
        const dataQuery = `
          SELECT
            r.id, r.interview_id, r.note_type, r.content, r.question_id, r.question,
            r.answer, r.asked_question, r.candidate_answer, r.pros, r.cons,
            r.suggestions, r.key_points, r.assessment, r.reference_answer, r.other_id, r.other_content, r.created_at, r.end_at, r.duration
          FROM interview_reviews r
          JOIN interviews i ON r.interview_id = i.id
          ${whereClause}
          ORDER BY r.created_at DESC
          LIMIT ? OFFSET ?
        `;
        const items = (app as any).db.prepare(dataQuery).all(...params, limit, offset);

        return {
          items: items || [],
          total,
          page,
          limit,
        };
      } catch (err: any) {
        app.log.error({ err, endpoint: 'GET /interview-reviews' }, '查询面试复盘条目失败');
        return reply.code(400).send(buildPrefixedError('查询面试复盘条目失败', err, 400));
      }
    }),
  );

  // 更新面试复盘条目
  app.put(
    '/interview-reviews/:id',
    withErrorLogging(app.log as any, 'interview-reviews.update', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const id = (req as any).params?.id as string;
        const body = z
          .object({
            note_type: z.string().optional(),
            content: z.string().optional(),
            question_id: z.string().optional(),
            question: z.string().optional(),
            answer: z.string().optional(),
            asked_question: z.string().optional(),
            candidate_answer: z.string().optional(),
            pros: z.string().optional(),
            cons: z.string().optional(),
            suggestions: z.string().optional(),
            key_points: z.string().optional(),
            assessment: z.string().optional(),
            reference_answer: z.string().optional(),
            other_id: z.string().optional(),
            other_content: z.string().optional(),
            end_at: z.number().optional(),
            duration: z.number().optional(),
          })
          .parse((req as any).body || {});

        // 验证复盘条目是否存在且属于当前用户
        const reviewRecord = (app as any).db
          .prepare(
            `
            SELECT r.id FROM interview_reviews r
            JOIN interviews i ON r.interview_id = i.id
            WHERE r.id=? AND i.user_id=?
          `,
          )
          .get(id, payload.uid);
        if (!reviewRecord) return reply.code(404).send({ error: '复盘条目不存在或无权限' });

        // 构建动态更新 SQL
        const updateFields = [];
        const updateValues = [];

        if (body.note_type !== undefined) {
          updateFields.push('note_type = ?');
          updateValues.push(body.note_type);
        }
        if (body.content !== undefined) {
          updateFields.push('content = ?');
          updateValues.push(body.content);
        }
        if (body.question_id !== undefined) {
          updateFields.push('question_id = ?');
          updateValues.push(body.question_id);
        }
        if (body.question !== undefined) {
          updateFields.push('question = ?');
          updateValues.push(body.question);
        }
        if (body.answer !== undefined) {
          updateFields.push('answer = ?');
          updateValues.push(body.answer);
        }
        if (body.asked_question !== undefined) {
          updateFields.push('asked_question = ?');
          updateValues.push(body.asked_question);
        }
        if (body.candidate_answer !== undefined) {
          updateFields.push('candidate_answer = ?');
          updateValues.push(body.candidate_answer);
        }
        if (body.pros !== undefined) {
          updateFields.push('pros = ?');
          updateValues.push(body.pros);
        }
        if (body.cons !== undefined) {
          updateFields.push('cons = ?');
          updateValues.push(body.cons);
        }
        if (body.suggestions !== undefined) {
          updateFields.push('suggestions = ?');
          updateValues.push(body.suggestions);
        }
        if (body.key_points !== undefined) {
          updateFields.push('key_points = ?');
          updateValues.push(body.key_points);
        }
        if (body.assessment !== undefined) {
          updateFields.push('assessment = ?');
          updateValues.push(body.assessment);
        }
        if (body.reference_answer !== undefined) {
          updateFields.push('reference_answer = ?');
          updateValues.push(body.reference_answer);
        }
        if (body.other_id !== undefined) {
          updateFields.push('other_id = ?');
          updateValues.push(body.other_id);
        }
        if (body.other_content !== undefined) {
          updateFields.push('other_content = ?');
          updateValues.push(body.other_content);
        }
        if (body.end_at !== undefined) {
          updateFields.push('end_at = ?');
          updateValues.push(body.end_at);
        }
        if (body.duration !== undefined) {
          updateFields.push('duration = ?');
          updateValues.push(body.duration);
        }

        if (updateFields.length > 0) {
          updateValues.push(id);
          (app as any).db
            .prepare(`UPDATE interview_reviews SET ${updateFields.join(', ')} WHERE id = ?`)
            .run(...updateValues);
        }

        // 记录操作日志
        await logOperation(app, req, {
          ...OPERATION_MAPPING.REVIEW,
          resourceId: id,
          resourceName: `面试复盘条目: ${id}`,
          operation: OperationType.UPDATE,
          message: `更新面试复盘条目: ${id}`,
          status: 'success',
          userId: payload.uid,
        });

        return { success: true };
      } catch (err: any) {
        app.log.error({ err, endpoint: 'PUT /interview-reviews/:id' }, '更新面试复盘条目失败');
        return reply.code(400).send(buildPrefixedError('更新面试复盘条目失败', err, 400));
      }
    }),
  );

  // =================== interview_insights 表 ===================
  // 字段含义：
  // - id: 剖析记录唯一标识
  // - interview_id: 关联的面试 ID (外键)
  // - interviewer_score: 面试官给出的契合度评分 (0-100 分)
  // - interviewer_summary: 面试官对候选人的整体总结
  // - interviewer_role: 面试官角色分析 (如"技术专家"、"团队 Leader"等)
  // - interviewer_mbti: 面试官的 MBTI 性格类型
  // - interviewer_personality: 面试官的个人特质描述
  // - interviewer_preference: 面试官对候选人的偏好/要求
  // - candidate_summary: 对候选人的总结分析
  // - candidate_mbti: 候选人的 MBTI 性格类型
  // - candidate_personality: 候选人的个人特质描述
  // - candidate_job_preference: 候选人的求职偏好
  // - strategy_prepare_details: 沟通策略-提前准备技术细节的建议
  // - strategy_business_understanding: 沟通策略-展示对业务理解的建议
  // - strategy_keep_logical: 沟通策略-保持逻辑清晰的建议
  // - created_at: 创建时间戳 (毫秒)

  // 创建面试剖析记录
  app.post(
    '/interview-insights',
    withErrorLogging(app.log as any, 'interview-insights.create', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const body = z
          .object({
            interview_id: z.string().min(1),
            interviewer_score: z.number().min(0).max(100).optional(),
            interviewer_summary: z.string().optional(),
            interviewer_role: z.string().optional(),
            interviewer_mbti: z.string().optional(),
            interviewer_personality: z.string().optional(),
            interviewer_preference: z.string().optional(),
            candidate_summary: z.string().optional(),
            candidate_mbti: z.string().optional(),
            candidate_personality: z.string().optional(),
            candidate_job_preference: z.string().optional(),
            strategy_prepare_details: z.string().optional(),
            strategy_business_understanding: z.string().optional(),
            strategy_keep_logical: z.string().optional(),
          })
          .parse((req as any).body || {});

        // 验证面试是否存在且属于当前用户
        const interview = (app as any).db
          .prepare('SELECT id FROM interviews WHERE id=? AND user_id=?')
          .get(body.interview_id, payload.uid);
        if (!interview) return reply.code(404).send({ error: '面试不存在或无权限' });

        const { randomUUID } = await import('crypto');
        const id = randomUUID();
        const now = Date.now();

        (app as any).db
          .prepare(
            `INSERT INTO interview_insights (
              id, interview_id, interviewer_score, interviewer_summary,
              interviewer_role, interviewer_mbti, interviewer_personality,
              interviewer_preference, candidate_summary, candidate_mbti,
              candidate_personality, candidate_job_preference,
              strategy_prepare_details, strategy_business_understanding,
              strategy_keep_logical, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            id,
            body.interview_id,
            body.interviewer_score || null,
            body.interviewer_summary || null,
            body.interviewer_role || null,
            body.interviewer_mbti || null,
            body.interviewer_personality || null,
            body.interviewer_preference || null,
            body.candidate_summary || null,
            body.candidate_mbti || null,
            body.candidate_personality || null,
            body.candidate_job_preference || null,
            body.strategy_prepare_details || null,
            body.strategy_business_understanding || null,
            body.strategy_keep_logical || null,
            now,
          );

        // 记录操作日志
        await logOperation(app, req, {
          ...OPERATION_MAPPING.REVIEW,
          resourceId: id,
          resourceName: `面试剖析: ${body.interview_id}`,
          operation: OperationType.CREATE,
          message: `创建面试剖析: ${body.interview_id}`,
          status: 'success',
          userId: payload.uid,
        });

        return { id };
      } catch (err: any) {
        app.log.error({ err, endpoint: 'POST /interview-insights' }, '创建面试剖析失败');
        return reply.code(400).send(buildPrefixedError('创建面试剖析失败', err, 400));
      }
    }),
  );

  // 更新面试剖析记录
  app.put(
    '/interview-insights/:id',
    withErrorLogging(app.log as any, 'interview-insights.update', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const id = (req as any).params?.id as string;
        const body = z
          .object({
            interviewer_score: z.number().min(0).max(100).optional(),
            interviewer_summary: z.string().optional(),
            interviewer_role: z.string().optional(),
            interviewer_mbti: z.string().optional(),
            interviewer_personality: z.string().optional(),
            interviewer_preference: z.string().optional(),
            candidate_summary: z.string().optional(),
            candidate_mbti: z.string().optional(),
            candidate_personality: z.string().optional(),
            candidate_job_preference: z.string().optional(),
            strategy_prepare_details: z.string().optional(),
            strategy_business_understanding: z.string().optional(),
            strategy_keep_logical: z.string().optional(),
          })
          .parse((req as any).body || {});

        // 验证剖析记录是否存在且属于当前用户
        const insightRecord = (app as any).db
          .prepare(
            `
            SELECT ins.id FROM interview_insights ins
            JOIN interviews i ON ins.interview_id = i.id
            WHERE ins.id=? AND i.user_id=?
          `,
          )
          .get(id, payload.uid);
        if (!insightRecord) return reply.code(404).send({ error: '剖析记录不存在或无权限' });

        // 构建动态更新 SQL
        const updateFields = [];
        const updateValues = [];

        if (body.interviewer_score !== undefined) {
          updateFields.push('interviewer_score = ?');
          updateValues.push(body.interviewer_score);
        }
        if (body.interviewer_summary !== undefined) {
          updateFields.push('interviewer_summary = ?');
          updateValues.push(body.interviewer_summary);
        }
        if (body.interviewer_role !== undefined) {
          updateFields.push('interviewer_role = ?');
          updateValues.push(body.interviewer_role);
        }
        if (body.interviewer_mbti !== undefined) {
          updateFields.push('interviewer_mbti = ?');
          updateValues.push(body.interviewer_mbti);
        }
        if (body.interviewer_personality !== undefined) {
          updateFields.push('interviewer_personality = ?');
          updateValues.push(body.interviewer_personality);
        }
        if (body.interviewer_preference !== undefined) {
          updateFields.push('interviewer_preference = ?');
          updateValues.push(body.interviewer_preference);
        }
        if (body.candidate_summary !== undefined) {
          updateFields.push('candidate_summary = ?');
          updateValues.push(body.candidate_summary);
        }
        if (body.candidate_mbti !== undefined) {
          updateFields.push('candidate_mbti = ?');
          updateValues.push(body.candidate_mbti);
        }
        if (body.candidate_personality !== undefined) {
          updateFields.push('candidate_personality = ?');
          updateValues.push(body.candidate_personality);
        }
        if (body.candidate_job_preference !== undefined) {
          updateFields.push('candidate_job_preference = ?');
          updateValues.push(body.candidate_job_preference);
        }
        if (body.strategy_prepare_details !== undefined) {
          updateFields.push('strategy_prepare_details = ?');
          updateValues.push(body.strategy_prepare_details);
        }
        if (body.strategy_business_understanding !== undefined) {
          updateFields.push('strategy_business_understanding = ?');
          updateValues.push(body.strategy_business_understanding);
        }
        if (body.strategy_keep_logical !== undefined) {
          updateFields.push('strategy_keep_logical = ?');
          updateValues.push(body.strategy_keep_logical);
        }

        if (updateFields.length > 0) {
          updateValues.push(id);
          (app as any).db
            .prepare(`UPDATE interview_insights SET ${updateFields.join(', ')} WHERE id = ?`)
            .run(...updateValues);
        }

        // 记录操作日志
        await logOperation(app, req, {
          ...OPERATION_MAPPING.REVIEW,
          resourceId: id,
          resourceName: `面试剖析: ${id}`,
          operation: OperationType.UPDATE,
          message: `更新面试剖析: ${id}`,
          status: 'success',
          userId: payload.uid,
        });

        return { success: true };
      } catch (err: any) {
        app.log.error({ err, endpoint: 'PUT /interview-insights/:id' }, '更新面试剖析失败');
        return reply.code(400).send(buildPrefixedError('更新面试剖析失败', err, 400));
      }
    }),
  );

  // 获取用户训练统计数据
  app.get(
    '/user-training-stats',
    withErrorLogging(app.log as any, 'user-training-stats.get', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();

        // 1. 获取训练总数（interviews 表的总条数）
        const trainingCountResult = (app as any).db
          .prepare('SELECT COUNT(*) as count FROM interviews WHERE user_id = ?')
          .get(payload.uid);
        const trainingCount = trainingCountResult?.count || 0;

        // 2. 获取总时长（interviews 表所有 duration 的总和，转换为小时）
        const totalDurationResult = (app as any).db
          .prepare('SELECT SUM(duration) as total FROM interviews WHERE user_id = ?')
          .get(payload.uid);
        const totalDurationMinutes = totalDurationResult?.total || 0;
        const totalHours = Math.round((totalDurationMinutes / 60) * 10) / 10; // 保留一位小数

        // 3. 获取平均对话数（interview_reviews 总条数 / 不同的 interview_id 数量）
        const reviewStatsResult = (app as any).db
          .prepare(
            `
            SELECT
              COUNT(*) as total_reviews,
              COUNT(DISTINCT r.interview_id) as distinct_interviews
            FROM interview_reviews r
            JOIN interviews i ON r.interview_id = i.id
            WHERE i.user_id = ?
          `,
          )
          .get(payload.uid);

        const totalReviews = reviewStatsResult?.total_reviews || 0;
        const distinctInterviews = reviewStatsResult?.distinct_interviews || 0;
        const avgConversations =
          distinctInterviews > 0 ? Math.round((totalReviews / distinctInterviews) * 10) / 10 : 0;

        return {
          success: true,
          data: {
            trainingCount, // 训练总数
            totalHours, // 总时长（小时）
            avgConversations, // 平均对话数
          },
        };
      } catch (err: any) {
        app.log.error({ err, endpoint: 'GET /user-training-stats' }, '获取用户训练统计数据失败');
        return reply.code(400).send(buildPrefixedError('获取用户训练统计数据失败', err, 400));
      }
    }),
  );

  // 获取上一次面试问过的问题（用于跨面试去重）
  app.get(
    '/previous-interview-questions',
    withErrorLogging(app.log as any, 'previous-interview-questions.get', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const query = z
          .object({
            jobId: z.string().min(1),
            currentInterviewId: z.string().optional(),
          })
          .parse((req as any).query || {});

        // 查找该用户该岗位上一次已完成的面试
        // 排除当前面试（如果提供了 currentInterviewId）
        let findLastInterviewSql = `
          SELECT id FROM interviews
          WHERE job_id = ? AND user_id = ? AND status = 'completed'
        `;
        const params: any[] = [query.jobId, payload.uid];

        if (query.currentInterviewId) {
          findLastInterviewSql += ' AND id != ?';
          params.push(query.currentInterviewId);
        }

        findLastInterviewSql += ' ORDER BY created_at DESC LIMIT 1';

        const lastInterview = (app as any).db.prepare(findLastInterviewSql).get(...params);

        if (!lastInterview) {
          // 没有找到上一次面试，返回空数组
          return {
            success: true,
            questions: [],
          };
        }

        // 获取上一次面试的所有问题
        const reviews = (app as any).db
          .prepare(
            `
            SELECT asked_question
            FROM interview_reviews
            WHERE interview_id = ? AND asked_question IS NOT NULL AND asked_question != ''
            ORDER BY created_at ASC
          `,
          )
          .all(lastInterview.id);

        const questions = reviews.map((r: any) => r.asked_question);

        return {
          success: true,
          questions,
        };
      } catch (err: any) {
        app.log.error(
          { err, endpoint: 'GET /previous-interview-questions' },
          '获取上一次面试问题失败',
        );
        return reply.code(400).send(buildPrefixedError('获取上一次面试问题失败', err, 400));
      }
    }),
  );
}
