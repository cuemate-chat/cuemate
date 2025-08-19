import { withErrorLogging } from '@cuemate/logger';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

export function registerInterviewQuestionRoutes(app: FastifyInstance) {
  // 标签 CRUD
  app.get(
    '/tags',
    withErrorLogging(app.log as any, 'tags.list', async (req, reply) => {
      try {
        await (req as any).jwtVerify();
        const rows = (app as any).db
          .prepare('SELECT id, name, created_at FROM tags ORDER BY created_at DESC')
          .all();
        return { items: rows };
      } catch (err) {
        return reply.code(401).send({ error: '未认证' });
      }
    }),
  );

  app.post(
    '/tags',
    withErrorLogging(app.log as any, 'tags.create', async (req, reply) => {
      try {
        await (req as any).jwtVerify();
        const body = z.object({ name: z.string().min(1).max(20) }).parse((req as any).body || {});
        const { randomUUID } = await import('crypto');
        const id = randomUUID();
        (app as any).db
          .prepare('INSERT INTO tags (id, name, created_at) VALUES (?, ?, ?)')
          .run(id, body.name, Date.now());
        return { id };
      } catch (err: any) {
        return reply.code(400).send({ error: err?.message || '创建失败' });
      }
    }),
  );

  app.put(
    '/tags/:id',
    withErrorLogging(app.log as any, 'tags.update', async (req, reply) => {
      try {
        await (req as any).jwtVerify();
        const id = (req as any).params?.id as string;
        const body = z.object({ name: z.string().min(1).max(20) }).parse((req as any).body || {});
        (app as any).db.prepare('UPDATE tags SET name=? WHERE id=?').run(body.name, id);
        return { success: true };
      } catch (err: any) {
        return reply.code(400).send({ error: err?.message || '更新失败' });
      }
    }),
  );

  app.delete(
    '/tags/:id',
    withErrorLogging(app.log as any, 'tags.delete', async (req, reply) => {
      try {
        await (req as any).jwtVerify();
        const id = (req as any).params?.id as string;
        (app as any).db.prepare('DELETE FROM tags WHERE id=?').run(id);
        return { success: true };
      } catch (err: any) {
        return reply.code(400).send({ error: err?.message || '删除失败' });
      }
    }),
  );
  app.post(
    '/interview-questions',
    withErrorLogging(app.log as any, 'interview-questions.create', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const body = z
          .object({
            jobId: z.string().min(1),
            title: z.string().min(1).max(200),
            description: z.string().max(1000).optional().default(''),
            tagId: z.string().optional(),
          })
          .parse((req as any).body || {});

        const { randomUUID } = await import('crypto');
        const qid = randomUUID();
        const now = Date.now();
        (app as any).db
          .prepare(
            'INSERT INTO interview_questions (id, job_id, question, answer, created_at, tag_id, vector_status) VALUES (?, ?, ?, ?, ?, ?, 0)',
          )
          .run(qid, body.jobId, body.title, body.description || '', now, body.tagId || null);

        // 同步到向量库
        try {
          const base = process.env.RAG_SERVICE_BASE || 'http://rag-service:3003';

          // 获取标签名称
          let tagName = null;
          if (body.tagId) {
            const tagRow = (app as any).db
              .prepare('SELECT name FROM tags WHERE id = ?')
              .get(body.tagId);
            tagName = tagRow?.name || null;
          }

          await fetch(`${base}/questions/process`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              question: {
                id: qid,
                title: body.title,
                description: body.description || '',
                job_id: body.jobId,
                tag_id: body.tagId || null,
                tag_name: tagName,
                user_id: payload.uid,
                created_at: now,
              },
            }),
          });
          try {
            (app as any).db
              .prepare('UPDATE interview_questions SET vector_status=1 WHERE id=?')
              .run(qid);
          } catch {}
        } catch (error) {
          app.log.error({ err: error }, 'Failed to sync question to RAG service');
        }

        return { id: qid };
      } catch (err) {
        return reply.code(401).send({ error: '未认证:' + err });
      }
    }),
  );

  // 同步统计：返回某岗位押题向量同步情况
  app.get(
    '/interview-questions/sync-stats',
    withErrorLogging(app.log as any, 'interview-questions.sync-stats', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const { jobId } = (req as any).query as { jobId?: string };
        if (!jobId) return reply.code(400).send({ error: '缺少 jobId' });

        // 校验归属
        const owned = (app as any).db
          .prepare('SELECT id FROM jobs WHERE id=? AND user_id=?')
          .get(jobId, payload.uid);
        if (!owned) return reply.code(404).send({ error: '岗位不存在或无权限' });

        const total = (app as any).db
          .prepare('SELECT COUNT(1) AS c FROM interview_questions WHERE job_id=?')
          .get(jobId)?.c as number;
        const synced = (app as any).db
          .prepare(
            'SELECT COUNT(1) AS c FROM interview_questions WHERE job_id=? AND vector_status=1',
          )
          .get(jobId)?.c as number;
        const unsynced = Math.max(0, (total || 0) - (synced || 0));
        return { total: total || 0, synced: synced || 0, unsynced };
      } catch (err: any) {
        return reply.code(401).send({ error: '未认证:' + err });
      }
    }),
  );

  // 批量同步：将指定岗位的押题全部写入向量库（存在则更新：先删后写）
  app.post(
    '/interview-questions/sync-batch',
    withErrorLogging(app.log as any, 'interview-questions.sync-batch', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const body = z
          .object({
            jobId: z.string().min(1),
          })
          .parse((req as any).body || {});

        // 校验归属
        const owned = (app as any).db
          .prepare('SELECT id FROM jobs WHERE id=? AND user_id=?')
          .get(body.jobId, payload.uid);
        if (!owned) return reply.code(404).send({ error: '岗位不存在或无权限' });

        const rows: Array<{
          id: string;
          question: string;
          answer: string;
          created_at: number;
          tag_id: string | null;
          tag_name: string | null;
        }> = (app as any).db
          .prepare(
            `SELECT q.id, q.question, q.answer, q.created_at, q.tag_id, t.name as tag_name
               FROM interview_questions q
          LEFT JOIN tags t ON q.tag_id = t.id
              WHERE q.job_id = ?
              ORDER BY q.created_at ASC`,
          )
          .all(body.jobId);

        const base = process.env.RAG_SERVICE_BASE || 'http://rag-service:3003';
        let success = 0;
        let failed = 0;
        for (const r of rows) {
          try {
            // 先删除旧数据（若存在）
            await fetch(`${base}/questions/${r.id}`, { method: 'DELETE' });
          } catch {}
          try {
            // 重新写入
            const resp = await fetch(`${base}/questions/process`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                question: {
                  id: r.id,
                  title: r.question,
                  description: r.answer || '',
                  job_id: body.jobId,
                  tag_id: r.tag_id,
                  tag_name: r.tag_name,
                  user_id: payload.uid,
                  created_at: r.created_at,
                },
              }),
            });
            if (!resp.ok) throw new Error(`RAG write failed: ${resp.status}`);
            (app as any).db
              .prepare('UPDATE interview_questions SET vector_status=1 WHERE id=?')
              .run(r.id);
            success++;
          } catch (e) {
            failed++;
            app.log.error({ err: e as any, questionId: r.id }, 'Sync one question failed');
          }
        }
        return { success, failed, total: rows.length };
      } catch (err: any) {
        return reply.code(401).send({ error: '未认证:' + err });
      }
    }),
  );
  // 分页查询：按 jobId 查询（interview_questions 直接挂 job_id）
  app.get(
    '/interview-questions',
    withErrorLogging(app.log as any, 'interview-questions.list', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const schema = z.object({
          jobId: z.string().min(1),
          page: z.coerce.number().min(1).default(1),
          pageSize: z.coerce.number().min(1).max(100).default(6),
          day: z.string().optional(),
          title: z.string().optional(),
          description: z.string().optional(),
          tagId: z.string().optional(),
        });
        const { jobId, page, pageSize, day, title, description, tagId } = schema.parse(
          (req as any).query || {},
        );
        const offset = (page - 1) * pageSize;

        // 构造 where 子句
        const where: string[] = ['j.user_id = ?', 'q.job_id = ?'];
        const args: any[] = [payload.uid, jobId];
        if (day) {
          // 传入格式 yyyy-mm-dd，计算当天 00:00:00~23:59:59
          const start = new Date(day + 'T00:00:00').getTime();
          const end = start + 24 * 3600 * 1000 - 1;
          where.push('q.created_at BETWEEN ? AND ?');
          args.push(start, end);
        }
        if (title) {
          where.push('q.question LIKE ?');
          args.push(`%${title}%`);
        }
        if (description) {
          where.push('q.answer LIKE ?');
          args.push(`%${description}%`);
        }
        if (tagId) {
          where.push('q.tag_id = ?');
          args.push(tagId);
        }

        const totalRow = (app as any).db
          .prepare(
            `SELECT COUNT(1) as cnt
             FROM interview_questions q
             JOIN jobs j ON q.job_id = j.id
            WHERE ${where.join(' AND ')}`,
          )
          .get(...args);
        const total = totalRow?.cnt ?? 0;

        const rows = (app as any).db
          .prepare(
            `SELECT q.id,
                  q.question AS title,
                  q.answer   AS description,
                  q.created_at,
                  q.vector_status,
                  q.tag_id,
                  t.name AS tag
             FROM interview_questions q
             JOIN jobs j ON q.job_id = j.id
        LEFT JOIN tags t ON q.tag_id = t.id
            WHERE ${where.join(' AND ')}
            ORDER BY q.created_at DESC
            LIMIT ? OFFSET ?`,
          )
          .all(...args, pageSize, offset);
        return { items: rows, total };
      } catch (err) {
        return reply.code(401).send({ error: '未认证:' + err });
      }
    }),
  );

  // 详情
  app.get(
    '/interview-questions/:id',
    withErrorLogging(app.log as any, 'interview-questions.detail', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const id = (req as any).params?.id as string;
        const row = (app as any).db
          .prepare(
            `SELECT q.id,
                  q.question AS title,
                  q.answer   AS description,
                  q.created_at,
                  q.vector_status
             FROM interview_questions q
             JOIN jobs j ON q.job_id = j.id
            WHERE q.id=? AND j.user_id = ?`,
          )
          .get(id, payload.uid);
        if (!row) return reply.code(404).send({ error: '不存在' });
        return { item: row };
      } catch (err) {
        return reply.code(401).send({ error: '未认证:' + err });
      }
    }),
  );

  // 更新（编辑保存）：允许修改 title/description -> 对应 question/answer
  app.put(
    '/interview-questions/:id',
    withErrorLogging(app.log as any, 'interview-questions.update', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const id = (req as any).params?.id as string;
        const body = z
          .object({
            title: z.string().min(1).max(200),
            description: z.string().min(1).max(5000),
            tagId: z.string().nullable().optional(),
          })
          .parse((req as any).body || {});
        // 校验归属并获取 job_id
        const own = (app as any).db
          .prepare(
            `SELECT q.id, q.job_id FROM interview_questions q JOIN jobs j ON q.job_id = j.id WHERE q.id=? AND j.user_id=?`,
          )
          .get(id, payload.uid);
        if (!own) return reply.code(404).send({ error: '不存在或无权限' });
        (app as any).db
          .prepare(
            'UPDATE interview_questions SET question=?, answer=?, tag_id=?, vector_status=0 WHERE id=?',
          )
          .run(body.title, body.description, body.tagId ?? null, id);
        try {
          const base = process.env.RAG_SERVICE_BASE || 'http://rag-service:3003';

          // 先删除旧的向量数据
          await fetch(`${base}/questions/${id}`, {
            method: 'DELETE',
          });

          // 获取标签名称
          let tagName = null;
          if (body.tagId) {
            const tagRow = (app as any).db
              .prepare('SELECT name FROM tags WHERE id = ?')
              .get(body.tagId);
            tagName = tagRow?.name || null;
          }

          // 重新处理并存入向量库
          await fetch(`${base}/questions/process`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              question: {
                id,
                title: body.title,
                description: body.description,
                job_id: own.job_id, // 需要获取 job_id
                tag_id: body.tagId || null,
                tag_name: tagName,
                user_id: payload.uid,
                created_at: Date.now(),
              },
            }),
          });
          try {
            (app as any).db
              .prepare('UPDATE interview_questions SET vector_status=1 WHERE id=?')
              .run(id);
          } catch {}
        } catch (error) {
          app.log.error({ err: error }, 'Failed to sync updated question to RAG service');
        }
        return { success: true };
      } catch (err) {
        return reply.code(401).send({ error: '未认证:' + err });
      }
    }),
  );

  // 删除
  app.delete(
    '/interview-questions/:id',
    withErrorLogging(app.log as any, 'interview-questions.delete', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const id = (req as any).params?.id as string;
        // 校验归属
        const own = (app as any).db
          .prepare(
            `SELECT q.id FROM interview_questions q JOIN jobs j ON q.job_id = j.id WHERE q.id=? AND j.user_id=?`,
          )
          .get(id, payload.uid);
        if (!own) return reply.code(404).send({ error: '不存在或无权限' });
        (app as any).db.prepare('DELETE FROM interview_questions WHERE id=?').run(id);
        try {
          const base = process.env.RAG_SERVICE_BASE || 'http://rag-service:3003';
          await fetch(`${base}/questions/${id}`, {
            method: 'DELETE',
          });
          try {
            (app as any).db
              .prepare('UPDATE interview_questions SET vector_status=0 WHERE id=?')
              .run(id);
          } catch {}
        } catch (error) {
          app.log.error({ err: error }, 'Failed to delete question from RAG service');
        }
        return { success: true };
      } catch (err) {
        app.log.error({ err }, '删除问题失败');
        return reply.code(401).send({ error: '未认证:' + err });
      }
    }),
  );
}
