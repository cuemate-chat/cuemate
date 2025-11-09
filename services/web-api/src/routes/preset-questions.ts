import { withErrorLogging } from '@cuemate/logger';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getRagServiceUrl, SERVICE_CONFIG } from '../config/services.js';
import { buildPrefixedError } from '../utils/error-response.js';
import { logOperation, OPERATION_MAPPING } from '../utils/operation-logger-helper.js';
import { OperationType } from '../utils/operation-logger.js';

export function registerPresetQuestionRoutes(app: FastifyInstance) {
  // 获取预置题库列表
  app.get(
    '/preset-questions',
    withErrorLogging(app.log as any, 'preset-questions.list', async (req, reply) => {
      try {
        await (req as any).jwtVerify();
        const schema = z.object({
          page: z.coerce.number().min(1).default(1),
          pageSize: z.coerce.number().min(1).max(100).default(8),
          keyword: z.string().optional(),
          tag_id: z.string().optional(),
          is_builtin: z.coerce.boolean().optional(),
          day: z.string().optional(), // 按日期过滤：yyyy-mm-dd
          question: z.string().optional(), // 按问题过滤
          answer: z.string().optional(), // 按答案过滤
        });

        const { page, pageSize, keyword, tag_id, is_builtin, day, question, answer } = schema.parse(
          (req as any).query || {},
        );
        const offset = (page - 1) * pageSize;

        // 构造 where 条件
        const where: string[] = [];
        const args: any[] = [];

        if (keyword) {
          where.push('(p.question LIKE ? OR p.answer LIKE ?)');
          args.push(`%${keyword}%`, `%${keyword}%`);
        }

        if (question) {
          where.push('p.question LIKE ?');
          args.push(`%${question}%`);
        }

        if (answer) {
          where.push('p.answer LIKE ?');
          args.push(`%${answer}%`);
        }

        if (tag_id) {
          where.push('p.tag_id = ?');
          args.push(tag_id);
        }

        if (is_builtin !== undefined) {
          where.push('p.is_builtin = ?');
          args.push(is_builtin ? 1 : 0);
        }

        if (day) {
          // 按日期过滤：yyyy-mm-dd 格式，计算当天 00:00:00~23:59:59
          const start = new Date(day + 'T00:00:00').getTime();
          const end = start + 24 * 3600 * 1000 - 1;
          where.push('p.created_at BETWEEN ? AND ?');
          args.push(start, end);
        }

        const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

        // 获取总数
        const totalRow = (app as any).db
          .prepare(
            `SELECT COUNT(1) as cnt
             FROM preset_questions p
             ${whereClause}`,
          )
          .get(...args);
        const total = totalRow?.cnt ?? 0;

        // 获取分页数据
        const rows = (app as any).db
          .prepare(
            `SELECT p.id,
                    p.question,
                    p.answer,
                    p.tag_id,
                    p.is_builtin,
                    p.synced_jobs,
                    p.created_at,
                    p.updated_at,
                    t.name AS tag_name
             FROM preset_questions p
             LEFT JOIN tags t ON p.tag_id = t.id
             ${whereClause}
             ORDER BY p.created_at DESC
             LIMIT ? OFFSET ?`,
          )
          .all(...args, pageSize, offset);

        // 处理 synced_jobs 字段（JSON 字符串转数组）
        const items = rows.map((row: any) => ({
          ...row,
          is_builtin: !!row.is_builtin,
          synced_jobs: row.synced_jobs ? JSON.parse(row.synced_jobs) : [],
        }));

        return { items, total, page, pageSize };
      } catch (err) {
        return reply.code(401).send(buildPrefixedError('获取预置题库列表失败', err, 401));
      }
    }),
  );

  // 获取单个预置题目详情
  app.get(
    '/preset-questions/:id',
    withErrorLogging(app.log as any, 'preset-questions.detail', async (req, reply) => {
      try {
        await (req as any).jwtVerify();
        const id = (req as any).params?.id as string;

        const row = (app as any).db
          .prepare(
            `SELECT p.id,
                    p.question,
                    p.answer,
                    p.tag_id,
                    p.is_builtin,
                    p.synced_jobs,
                    p.created_at,
                    p.updated_at
             FROM preset_questions p
             WHERE p.id = ?`,
          )
          .get(id);

        if (!row) return reply.code(404).send({ error: '题目不存在' });

        const item = {
          ...row,
          is_builtin: !!row.is_builtin,
          synced_jobs: row.synced_jobs ? JSON.parse(row.synced_jobs) : [],
        };

        return { item };
      } catch (err) {
        return reply.code(401).send(buildPrefixedError('获取预置题目详情失败', err, 401));
      }
    }),
  );

  // 创建预置题目
  app.post(
    '/preset-questions',
    withErrorLogging(app.log as any, 'preset-questions.create', async (req, reply) => {
      try {
        await (req as any).jwtVerify();
        const body = z
          .object({
            question: z.string().min(1).max(500),
            answer: z.string().min(1).max(5000),
            tag_id: z.string().nullable().optional(),
          })
          .parse((req as any).body || {});

        const { randomUUID } = await import('crypto');
        const id = randomUUID();
        const now = Date.now();

        (app as any).db
          .prepare(
            'INSERT INTO preset_questions (id, question, answer, tag_id, is_builtin, synced_jobs, created_at) VALUES (?, ?, ?, ?, 0, ?, ?)',
          )
          .run(id, body.question, body.answer, body.tag_id || null, '[]', now);

        // 记录操作日志
        const payload = (req as any).user as any;
        await logOperation(app, req, {
          ...OPERATION_MAPPING.PRESET_QUESTION,
          resourceId: id,
          resourceName: body.question.substring(0, 50) + '...',
          operation: OperationType.CREATE,
          message: `创建预置题目: ${body.question.substring(0, 30)}...`,
          status: 'success',
          userId: payload.uid
        });

        return { id };
      } catch (err: any) {
        return reply.code(400).send(buildPrefixedError('创建预置题目失败', err, 400));
      }
    }),
  );

  // 更新预置题目
  app.put(
    '/preset-questions/:id',
    withErrorLogging(app.log as any, 'preset-questions.update', async (req, reply) => {
      try {
        await (req as any).jwtVerify();
        const id = (req as any).params?.id as string;
        const body = z
          .object({
            question: z.string().min(1).max(500).optional(),
            answer: z.string().min(1).max(5000).optional(),
            tag_id: z.string().nullable().optional(),
          })
          .parse((req as any).body || {});

        // 检查是否是内置题目
        const existing = (app as any).db
          .prepare('SELECT id, is_builtin FROM preset_questions WHERE id = ?')
          .get(id);

        if (!existing) {
          return reply.code(404).send({ error: '题目不存在' });
        }

        // 允许编辑内置题目
        // if (existing.is_builtin) {
        //   return reply.code(400).send({ error: '内置题目无法修改' });
        // }

        const now = Date.now();
        const updates: string[] = ['updated_at = ?'];
        const args: any[] = [now];

        if (body.question !== undefined) {
          updates.push('question = ?');
          args.push(body.question);
        }

        if (body.answer !== undefined) {
          updates.push('answer = ?');
          args.push(body.answer);
        }

        if (body.tag_id !== undefined) {
          updates.push('tag_id = ?');
          args.push(body.tag_id);
        }

        args.push(id);

        (app as any).db
          .prepare(`UPDATE preset_questions SET ${updates.join(', ')} WHERE id = ?`)
          .run(...args);

        // 记录操作日志
        const payload = (req as any).user as any;
        await logOperation(app, req, {
          ...OPERATION_MAPPING.PRESET_QUESTION,
          resourceId: id,
          resourceName: body.question ? body.question.substring(0, 50) + '...' : '预置题目',
          operation: OperationType.UPDATE,
          message: `更新预置题目: ${existing.id}`,
          status: 'success',
          userId: payload.uid
        });

        return { success: true };
      } catch (err: any) {
        return reply.code(400).send(buildPrefixedError('更新预置题目失败', err, 400));
      }
    }),
  );

  // 删除预置题目
  app.delete(
    '/preset-questions/:id',
    withErrorLogging(app.log as any, 'preset-questions.delete', async (req, reply) => {
      try {
        await (req as any).jwtVerify();
        const id = (req as any).params?.id as string;

        // 检查是否是内置题目
        const existing = (app as any).db
          .prepare('SELECT id, is_builtin FROM preset_questions WHERE id = ?')
          .get(id);

        if (!existing) {
          return reply.code(404).send({ error: '题目不存在' });
        }

        // 允许删除内置题目
        // if (existing.is_builtin) {
        //   return reply.code(400).send({ error: '内置题目无法删除' });
        // }

        // 先获取题目信息用于日志记录
        const questionToDelete = (app as any).db
          .prepare('SELECT question FROM preset_questions WHERE id = ?')
          .get(id);
          
        (app as any).db.prepare('DELETE FROM preset_questions WHERE id = ?').run(id);
        
        // 记录操作日志
        const payload = (req as any).user as any;
        await logOperation(app, req, {
          ...OPERATION_MAPPING.PRESET_QUESTION,
          resourceId: id,
          resourceName: questionToDelete ? questionToDelete.question.substring(0, 50) + '...' : '预置题目',
          operation: OperationType.DELETE,
          message: `删除预置题目: ${questionToDelete ? questionToDelete.question.substring(0, 30) : id}...`,
          status: 'success',
          userId: payload.uid
        });
        
        return { success: true };
      } catch (err: any) {
        return reply.code(400).send(buildPrefixedError('删除预置题目失败', err, 400));
      }
    }),
  );

  // 批量删除预置题目
  app.post(
    '/preset-questions/batch-delete',
    withErrorLogging(app.log as any, 'preset-questions.batch-delete', async (req, reply) => {
      try {
        await (req as any).jwtVerify();
        const body = z
          .object({
            ids: z.array(z.string()).min(1).max(100),
          })
          .parse((req as any).body || {});

        // 允许批量删除内置题目
        // const builtinCount =
        //   (app as any).db
        //     .prepare(
        //       `SELECT COUNT(1) as cnt FROM preset_questions WHERE id IN (${body.ids.map(() => '?').join(',')}) AND is_builtin = 1`,
        //     )
        //     .get(...body.ids)?.cnt || 0;

        // if (builtinCount > 0) {
        //   return reply.code(400).send({ error: '选中的题目中包含内置题目，无法删除' });
        // }

        const deletedCount = (app as any).db
          .prepare(
            `DELETE FROM preset_questions WHERE id IN (${body.ids.map(() => '?').join(',')})`,
          )
          .run(...body.ids).changes;

        // 记录操作日志
        const payload = (req as any).user as any;
        await logOperation(app, req, {
          ...OPERATION_MAPPING.PRESET_QUESTION,
          resourceId: `batch_${body.ids.length}`,
          resourceName: `批量删除${body.ids.length}个预置题目`,
          operation: OperationType.DELETE,
          message: `批量删除预置题目: ${deletedCount}/${body.ids.length} 个成功`,
          status: 'success',
          userId: payload.uid
        });

        return { success: true, deletedCount };
      } catch (err: any) {
        return reply.code(400).send(buildPrefixedError('批量删除预置题目失败', err, 400));
      }
    }),
  );

  // 批量同步到面试题库
  app.post(
    '/preset-questions/batch-sync',
    withErrorLogging(app.log as any, 'preset-questions.batch-sync', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const body = z
          .object({
            presetQuestionIds: z.array(z.string()).min(1).max(100),
            jobId: z.string().min(1),
          })
          .parse((req as any).body || {});

        // 校验岗位归属
        const job = (app as any).db
          .prepare('SELECT id FROM jobs WHERE id = ? AND user_id = ?')
          .get(body.jobId, payload.uid);

        if (!job) {
          return reply.code(404).send({ error: '岗位不存在或无权限' });
        }

        // 获取预置题目
        const presetQuestions = (app as any).db
          .prepare(
            `SELECT * FROM preset_questions WHERE id IN (${body.presetQuestionIds.map(() => '?').join(',')})`,
          )
          .all(...body.presetQuestionIds);

        // 获取已存在的面试题目（避免重复）
        const existingQuestions = (app as any).db
          .prepare('SELECT question FROM interview_questions WHERE job_id = ?')
          .all(body.jobId)
          .map((row: any) => row.question);

        const existingSet = new Set(existingQuestions);

        let syncedCount = 0;
        let skippedCount = 0;
        const { randomUUID } = await import('crypto');

        for (const preset of presetQuestions) {
          // 检查是否已存在相同问题
          if (existingSet.has(preset.question)) {
            skippedCount++;
            continue;
          }

          try {
            const questionId = randomUUID();
            const now = Date.now();

            // 插入到面试题库
            (app as any).db
              .prepare(
                'INSERT INTO interview_questions (id, job_id, question, answer, created_at, tag_id, vector_status) VALUES (?, ?, ?, ?, ?, ?, 0)',
              )
              .run(questionId, body.jobId, preset.question, preset.answer, now, preset.tag_id);

            // 更新预置题目的同步状态
            const syncedJobs = preset.synced_jobs ? JSON.parse(preset.synced_jobs) : [];
            if (!syncedJobs.includes(body.jobId)) {
              syncedJobs.push(body.jobId);
              (app as any).db
                .prepare('UPDATE preset_questions SET synced_jobs = ? WHERE id = ?')
                .run(JSON.stringify(syncedJobs), preset.id);
            }

            // 同步到向量库（类似 interview-questions 的逻辑）
            try {
              // 获取标签名称
              let tagName = null;
              if (preset.tag_id) {
                const tagRow = (app as any).db
                  .prepare('SELECT name FROM tags WHERE id = ?')
                  .get(preset.tag_id);
                tagName = tagRow?.name || null;
              }

              await fetch(
                getRagServiceUrl(SERVICE_CONFIG.RAG_SERVICE.ENDPOINTS.QUESTIONS_PROCESS),
                {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({
                    question: {
                      id: questionId,
                      title: preset.question,
                      description: preset.answer,
                      job_id: body.jobId,
                      tag_id: preset.tag_id,
                      tag_name: tagName,
                      user_id: payload.uid,
                      created_at: now,
                    },
                  }),
                },
              );

              // 更新向量同步状态
              (app as any).db
                .prepare('UPDATE interview_questions SET vector_status = 1 WHERE id = ?')
                .run(questionId);
            } catch (error) {
              app.log.error({ err: error }, 'Failed to sync question to RAG service');
            }

            syncedCount++;
          } catch (error) {
            app.log.error({ err: error }, 'Failed to sync preset question to interview questions');
            skippedCount++;
          }
        }

        // 记录操作日志
        await logOperation(app, req, {
          ...OPERATION_MAPPING.PRESET_QUESTION,
          resourceId: body.jobId,
          resourceName: `批量同步${body.presetQuestionIds.length}个预置题目`,
          operation: OperationType.CREATE,
          message: `批量同步预置题目到面试题库: ${syncedCount}/${body.presetQuestionIds.length} 个成功`,
          status: 'success',
          userId: payload.uid
        });

        return { success: true, syncedCount, skippedCount };
      } catch (err: any) {
        return reply.code(400).send(buildPrefixedError('批量同步预置题目失败', err, 400));
      }
    }),
  );

  // 批量导入预置题目（从 CSV 或 JSON）
  app.post(
    '/preset-questions/batch-import',
    withErrorLogging(app.log as any, 'preset-questions.batch-import', async (req, reply) => {
      try {
        await (req as any).jwtVerify();
        const body = z
          .object({
            questions: z
              .array(
                z.object({
                  question: z.string().min(1).max(500),
                  answer: z.string().min(1).max(5000),
                  tag_name: z.string().nullable().optional(), // 标签名称，不是 ID
                }),
              )
              .min(1)
              .max(1000),
            overwrite: z.boolean().default(false), // 是否覆盖相同问题
          })
          .parse((req as any).body || {});

        const { randomUUID } = await import('crypto');
        const now = Date.now();

        let importedCount = 0;
        let skippedCount = 0;
        let errors: string[] = [];

        // 获取现有问题（用于去重）
        const existingQuestions = new Set(
          (app as any).db
            .prepare('SELECT question FROM preset_questions')
            .all()
            .map((row: any) => row.question),
        );

        // 标签名称到 ID 的缓存，避免重复查询
        const tagCache = new Map<string, string>();

        // 辅助函数：根据标签名称获取或创建标签 ID
        const getOrCreateTagId = (tagName: string | null | undefined): string | null => {
          if (!tagName || tagName.trim() === '') {
            return null;
          }

          const trimmedName = tagName.trim();

          // 检查缓存
          if (tagCache.has(trimmedName)) {
            return tagCache.get(trimmedName)!;
          }

          // 查询 tags 表（LIMIT 1 确保只取第一条）
          const existingTag = (app as any).db
            .prepare('SELECT id FROM tags WHERE name = ? LIMIT 1')
            .get(trimmedName);

          if (existingTag) {
            tagCache.set(trimmedName, existingTag.id);
            return existingTag.id;
          }

          // 标签不存在，创建新标签
          const tagId = randomUUID();
          (app as any).db
            .prepare('INSERT INTO tags (id, name, created_at) VALUES (?, ?, ?)')
            .run(tagId, trimmedName, now);

          tagCache.set(trimmedName, tagId);
          app.log.info({ tagName: trimmedName, tagId }, '自动创建新标签');
          return tagId;
        };

        for (const [index, item] of body.questions.entries()) {
          try {
            const id = randomUUID();

            // 获取或创建标签 ID
            const tagId = getOrCreateTagId(item.tag_name);

            if (body.overwrite && existingQuestions.has(item.question)) {
              // 覆盖模式：更新现有记录
              (app as any).db
                .prepare(
                  'UPDATE preset_questions SET answer = ?, tag_id = ?, updated_at = ? WHERE question = ?',
                )
                .run(item.answer, tagId, now, item.question);
            } else {
              // 非覆盖模式或新问题：直接插入（允许重复问题文本）
              (app as any).db
                .prepare(
                  'INSERT INTO preset_questions (id, question, answer, tag_id, is_builtin, synced_jobs, created_at) VALUES (?, ?, ?, ?, 0, ?, ?)',
                )
                .run(id, item.question, item.answer, tagId, '[]', now);

              existingQuestions.add(item.question);
            }

            importedCount++;
          } catch (error: any) {
            errors.push(`第${index + 1}行: ${error.message}`);
            if (errors.length > 10) break; // 最多记录 10 个错误
          }
        }

        // 记录操作日志
        const payload = (req as any).user as any;
        await logOperation(app, req, {
          ...OPERATION_MAPPING.PRESET_QUESTION,
          resourceId: `batch_import_${now}`,
          resourceName: `批量导入${body.questions.length}个预置题目`,
          operation: OperationType.CREATE,
          message: `批量导入预置题目: ${importedCount}/${body.questions.length} 个成功`,
          status: 'success',
          userId: payload.uid
        });

        return {
          success: true,
          importedCount,
          skippedCount,
          totalCount: body.questions.length,
          errors: errors.length > 0 ? errors : undefined,
        };
      } catch (err: any) {
        return reply.code(400).send(buildPrefixedError('批量导入预置题目失败', err, 400));
      }
    }),
  );
}
