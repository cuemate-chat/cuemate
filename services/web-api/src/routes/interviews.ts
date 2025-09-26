import { withErrorLogging } from '@cuemate/logger';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { buildPrefixedError } from '../utils/error-response.js';
import { logOperation, OPERATION_MAPPING } from '../utils/operation-logger-helper.js';
import { OperationType } from '../utils/operation-logger.js';

export function registerInterviewRoutes(app: FastifyInstance) {
  // =================== interview_scores 表 ===================
  // 字段含义：
  // - total_score: 综合评分 (0-100分)
  // - duration_sec: 面试持续时间(秒)
  // - num_questions: 面试问题数量
  // - overall_summary: 整体总结文本
  // - pros: 整体优点评价
  // - cons: 整体缺点评价
  // - suggestions: 整体改进建议
  // - radar_*: 5维雷达评分 (0-100分)
  //   * radar_interactivity: 互动性评分
  //   * radar_confidence: 自信度评分
  //   * radar_professionalism: 专业性评分
  //   * radar_relevance: 回答相关性评分
  //   * radar_clarity: 表达流畅性评分

  // 创建面试评分记录
  app.post(
    '/interview-scores',
    withErrorLogging(app.log as any, 'interview-scores.create', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const body = z
          .object({
            interviewId: z.string().min(1),
            totalScore: z.number().min(0).max(100),
            durationSec: z.number().min(0),
            numQuestions: z.number().min(0),
            overallSummary: z.string().optional(),
            pros: z.string().optional(),
            cons: z.string().optional(),
            suggestions: z.string().optional(),
            radarInteractivity: z.number().min(0).max(100).default(0),
            radarConfidence: z.number().min(0).max(100).default(0),
            radarProfessionalism: z.number().min(0).max(100).default(0),
            radarRelevance: z.number().min(0).max(100).default(0),
            radarClarity: z.number().min(0).max(100).default(0),
          })
          .parse((req as any).body || {});

        // 验证面试是否存在且属于当前用户
        const interview = (app as any).db
          .prepare('SELECT id FROM interviews WHERE id=? AND user_id=?')
          .get(body.interviewId, payload.uid);
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
            body.interviewId,
            body.totalScore,
            body.durationSec,
            body.numQuestions,
            body.overallSummary || null,
            body.pros || null,
            body.cons || null,
            body.suggestions || null,
            body.radarInteractivity,
            body.radarConfidence,
            body.radarProfessionalism,
            body.radarRelevance,
            body.radarClarity,
            now,
          );

        // 记录操作日志
        await logOperation(app, req, {
          ...OPERATION_MAPPING.REVIEW,
          resourceId: id,
          resourceName: `面试评分: ${body.interviewId}`,
          operation: OperationType.CREATE,
          message: `创建面试评分: ${body.interviewId}`,
          status: 'success',
          userId: payload.uid,
        });

        return { id };
      } catch (err: any) {
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
            totalScore: z.number().min(0).max(100).optional(),
            durationSec: z.number().min(0).optional(),
            numQuestions: z.number().min(0).optional(),
            overallSummary: z.string().optional(),
            pros: z.string().optional(),
            cons: z.string().optional(),
            suggestions: z.string().optional(),
            radarInteractivity: z.number().min(0).max(100).optional(),
            radarConfidence: z.number().min(0).max(100).optional(),
            radarProfessionalism: z.number().min(0).max(100).optional(),
            radarRelevance: z.number().min(0).max(100).optional(),
            radarClarity: z.number().min(0).max(100).optional(),
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

        // 构建动态更新SQL
        const updateFields = [];
        const updateValues = [];

        if (body.totalScore !== undefined) {
          updateFields.push('total_score = ?');
          updateValues.push(body.totalScore);
        }
        if (body.durationSec !== undefined) {
          updateFields.push('duration_sec = ?');
          updateValues.push(body.durationSec);
        }
        if (body.numQuestions !== undefined) {
          updateFields.push('num_questions = ?');
          updateValues.push(body.numQuestions);
        }
        if (body.overallSummary !== undefined) {
          updateFields.push('overall_summary = ?');
          updateValues.push(body.overallSummary);
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
        if (body.radarInteractivity !== undefined) {
          updateFields.push('radar_interactivity = ?');
          updateValues.push(body.radarInteractivity);
        }
        if (body.radarConfidence !== undefined) {
          updateFields.push('radar_confidence = ?');
          updateValues.push(body.radarConfidence);
        }
        if (body.radarProfessionalism !== undefined) {
          updateFields.push('radar_professionalism = ?');
          updateValues.push(body.radarProfessionalism);
        }
        if (body.radarRelevance !== undefined) {
          updateFields.push('radar_relevance = ?');
          updateValues.push(body.radarRelevance);
        }
        if (body.radarClarity !== undefined) {
          updateFields.push('radar_clarity = ?');
          updateValues.push(body.radarClarity);
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
        return reply.code(400).send(buildPrefixedError('更新面试评分失败', err, 400));
      }
    }),
  );

  // =================== interview_reviews 表 ===================
  // 字段含义：
  // - interview_id: 关联的面试ID
  // - note_type: 类型('mock','training')
  // - content: 主要内容文本
  // - question_id: 关联的面试题ID (可选)
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

  // 创建面试复盘条目
  app.post(
    '/interview-reviews',
    withErrorLogging(app.log as any, 'interview-reviews.create', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const body = z
          .object({
            interviewId: z.string().min(1),
            noteType: z.string().default('question'),
            content: z.string().min(1),
            questionId: z.string().optional(),
            question: z.string().optional(),
            answer: z.string().optional(),
            askedQuestion: z.string().optional(),
            candidateAnswer: z.string().optional(),
            pros: z.string().optional(),
            cons: z.string().optional(),
            suggestions: z.string().optional(),
            keyPoints: z.string().optional(),
            assessment: z.string().optional(),
            referenceAnswer: z.string().optional(),
          })
          .parse((req as any).body || {});

        // 验证面试是否存在且属于当前用户
        const interview = (app as any).db
          .prepare('SELECT id FROM interviews WHERE id=? AND user_id=?')
          .get(body.interviewId, payload.uid);
        if (!interview) return reply.code(404).send({ error: '面试不存在或无权限' });

        const { randomUUID } = await import('crypto');
        const id = randomUUID();
        const now = Date.now();

        (app as any).db
          .prepare(
            `INSERT INTO interview_reviews (
              id, interview_id, note_type, content, question_id, question,
              answer, asked_question, candidate_answer, pros, cons,
              suggestions, key_points, assessment, reference_answer, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            id,
            body.interviewId,
            body.noteType,
            body.content,
            body.questionId || null,
            body.question || null,
            body.answer || null,
            body.askedQuestion || null,
            body.candidateAnswer || null,
            body.pros || null,
            body.cons || null,
            body.suggestions || null,
            body.keyPoints || null,
            body.assessment || null,
            body.referenceAnswer || null,
            now,
          );

        // 记录操作日志
        await logOperation(app, req, {
          ...OPERATION_MAPPING.REVIEW,
          resourceId: id,
          resourceName: `面试复盘条目: ${body.interviewId}`,
          operation: OperationType.CREATE,
          message: `创建面试复盘条目: ${body.interviewId}`,
          status: 'success',
          userId: payload.uid,
        });

        return { id };
      } catch (err: any) {
        return reply.code(400).send(buildPrefixedError('创建面试复盘条目失败', err, 400));
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
            noteType: z.string().optional(),
            content: z.string().optional(),
            questionId: z.string().optional(),
            question: z.string().optional(),
            answer: z.string().optional(),
            askedQuestion: z.string().optional(),
            candidateAnswer: z.string().optional(),
            pros: z.string().optional(),
            cons: z.string().optional(),
            suggestions: z.string().optional(),
            keyPoints: z.string().optional(),
            assessment: z.string().optional(),
            referenceAnswer: z.string().optional(),
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

        // 构建动态更新SQL
        const updateFields = [];
        const updateValues = [];

        if (body.noteType !== undefined) {
          updateFields.push('note_type = ?');
          updateValues.push(body.noteType);
        }
        if (body.content !== undefined) {
          updateFields.push('content = ?');
          updateValues.push(body.content);
        }
        if (body.questionId !== undefined) {
          updateFields.push('question_id = ?');
          updateValues.push(body.questionId);
        }
        if (body.question !== undefined) {
          updateFields.push('question = ?');
          updateValues.push(body.question);
        }
        if (body.answer !== undefined) {
          updateFields.push('answer = ?');
          updateValues.push(body.answer);
        }
        if (body.askedQuestion !== undefined) {
          updateFields.push('asked_question = ?');
          updateValues.push(body.askedQuestion);
        }
        if (body.candidateAnswer !== undefined) {
          updateFields.push('candidate_answer = ?');
          updateValues.push(body.candidateAnswer);
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
        if (body.keyPoints !== undefined) {
          updateFields.push('key_points = ?');
          updateValues.push(body.keyPoints);
        }
        if (body.assessment !== undefined) {
          updateFields.push('assessment = ?');
          updateValues.push(body.assessment);
        }
        if (body.referenceAnswer !== undefined) {
          updateFields.push('reference_answer = ?');
          updateValues.push(body.referenceAnswer);
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
        return reply.code(400).send(buildPrefixedError('更新面试复盘条目失败', err, 400));
      }
    }),
  );

  // =================== interview_insights 表 ===================
  // 字段含义：
  // - interviewer_score: 面试官给出的契合度评分 (0-100分)
  // - interviewer_summary: 面试官对候选人的整体总结
  // - interviewer_role: 面试官角色分析 (如"技术专家"、"团队Leader"等)
  // - interviewer_mbti: 面试官的MBTI性格类型
  // - interviewer_personality: 面试官的个人特质描述
  // - interviewer_preference: 面试官对候选人的偏好/要求
  // - candidate_summary: 对候选人的总结分析
  // - candidate_mbti: 候选人的MBTI性格类型
  // - candidate_personality: 候选人的个人特质描述
  // - candidate_job_preference: 候选人的求职偏好
  // - strategy_prepare_details: 沟通策略-提前准备技术细节的建议
  // - strategy_business_understanding: 沟通策略-展示对业务理解的建议
  // - strategy_keep_logical: 沟通策略-保持逻辑清晰的建议

  // 创建面试剖析记录
  app.post(
    '/interview-insights',
    withErrorLogging(app.log as any, 'interview-insights.create', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const body = z
          .object({
            interviewId: z.string().min(1),
            interviewerScore: z.number().min(0).max(100).optional(),
            interviewerSummary: z.string().optional(),
            interviewerRole: z.string().optional(),
            interviewerMbti: z.string().optional(),
            interviewerPersonality: z.string().optional(),
            interviewerPreference: z.string().optional(),
            candidateSummary: z.string().optional(),
            candidateMbti: z.string().optional(),
            candidatePersonality: z.string().optional(),
            candidateJobPreference: z.string().optional(),
            strategyPrepareDetails: z.string().optional(),
            strategyBusinessUnderstanding: z.string().optional(),
            strategyKeepLogical: z.string().optional(),
          })
          .parse((req as any).body || {});

        // 验证面试是否存在且属于当前用户
        const interview = (app as any).db
          .prepare('SELECT id FROM interviews WHERE id=? AND user_id=?')
          .get(body.interviewId, payload.uid);
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
            body.interviewId,
            body.interviewerScore || null,
            body.interviewerSummary || null,
            body.interviewerRole || null,
            body.interviewerMbti || null,
            body.interviewerPersonality || null,
            body.interviewerPreference || null,
            body.candidateSummary || null,
            body.candidateMbti || null,
            body.candidatePersonality || null,
            body.candidateJobPreference || null,
            body.strategyPrepareDetails || null,
            body.strategyBusinessUnderstanding || null,
            body.strategyKeepLogical || null,
            now,
          );

        // 记录操作日志
        await logOperation(app, req, {
          ...OPERATION_MAPPING.REVIEW,
          resourceId: id,
          resourceName: `面试剖析: ${body.interviewId}`,
          operation: OperationType.CREATE,
          message: `创建面试剖析: ${body.interviewId}`,
          status: 'success',
          userId: payload.uid,
        });

        return { id };
      } catch (err: any) {
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
            interviewerScore: z.number().min(0).max(100).optional(),
            interviewerSummary: z.string().optional(),
            interviewerRole: z.string().optional(),
            interviewerMbti: z.string().optional(),
            interviewerPersonality: z.string().optional(),
            interviewerPreference: z.string().optional(),
            candidateSummary: z.string().optional(),
            candidateMbti: z.string().optional(),
            candidatePersonality: z.string().optional(),
            candidateJobPreference: z.string().optional(),
            strategyPrepareDetails: z.string().optional(),
            strategyBusinessUnderstanding: z.string().optional(),
            strategyKeepLogical: z.string().optional(),
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

        // 构建动态更新SQL
        const updateFields = [];
        const updateValues = [];

        if (body.interviewerScore !== undefined) {
          updateFields.push('interviewer_score = ?');
          updateValues.push(body.interviewerScore);
        }
        if (body.interviewerSummary !== undefined) {
          updateFields.push('interviewer_summary = ?');
          updateValues.push(body.interviewerSummary);
        }
        if (body.interviewerRole !== undefined) {
          updateFields.push('interviewer_role = ?');
          updateValues.push(body.interviewerRole);
        }
        if (body.interviewerMbti !== undefined) {
          updateFields.push('interviewer_mbti = ?');
          updateValues.push(body.interviewerMbti);
        }
        if (body.interviewerPersonality !== undefined) {
          updateFields.push('interviewer_personality = ?');
          updateValues.push(body.interviewerPersonality);
        }
        if (body.interviewerPreference !== undefined) {
          updateFields.push('interviewer_preference = ?');
          updateValues.push(body.interviewerPreference);
        }
        if (body.candidateSummary !== undefined) {
          updateFields.push('candidate_summary = ?');
          updateValues.push(body.candidateSummary);
        }
        if (body.candidateMbti !== undefined) {
          updateFields.push('candidate_mbti = ?');
          updateValues.push(body.candidateMbti);
        }
        if (body.candidatePersonality !== undefined) {
          updateFields.push('candidate_personality = ?');
          updateValues.push(body.candidatePersonality);
        }
        if (body.candidateJobPreference !== undefined) {
          updateFields.push('candidate_job_preference = ?');
          updateValues.push(body.candidateJobPreference);
        }
        if (body.strategyPrepareDetails !== undefined) {
          updateFields.push('strategy_prepare_details = ?');
          updateValues.push(body.strategyPrepareDetails);
        }
        if (body.strategyBusinessUnderstanding !== undefined) {
          updateFields.push('strategy_business_understanding = ?');
          updateValues.push(body.strategyBusinessUnderstanding);
        }
        if (body.strategyKeepLogical !== undefined) {
          updateFields.push('strategy_keep_logical = ?');
          updateValues.push(body.strategyKeepLogical);
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
        return reply.code(400).send(buildPrefixedError('更新面试剖析失败', err, 400));
      }
    }),
  );
}
