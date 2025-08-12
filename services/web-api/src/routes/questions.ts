import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

export function registerInterviewQuestionRoutes(app: FastifyInstance) {
  // 标签 CRUD
  app.get('/tags', async (req, reply) => {
    try {
      await (req as any).jwtVerify();
      const rows = (app as any).db
        .prepare('SELECT id, name, created_at FROM tags ORDER BY created_at DESC')
        .all();
      return { items: rows };
    } catch (err) {
      return reply.code(401).send({ error: '未认证' });
    }
  });

  app.post('/tags', async (req, reply) => {
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
  });

  app.put('/tags/:id', async (req, reply) => {
    try {
      await (req as any).jwtVerify();
      const id = (req as any).params?.id as string;
      const body = z.object({ name: z.string().min(1).max(20) }).parse((req as any).body || {});
      (app as any).db.prepare('UPDATE tags SET name=? WHERE id=?').run(body.name, id);
      return { success: true };
    } catch (err: any) {
      return reply.code(400).send({ error: err?.message || '更新失败' });
    }
  });

  app.delete('/tags/:id', async (req, reply) => {
    try {
      await (req as any).jwtVerify();
      const id = (req as any).params?.id as string;
      (app as any).db.prepare('DELETE FROM tags WHERE id=?').run(id);
      return { success: true };
    } catch (err: any) {
      return reply.code(400).send({ error: err?.message || '删除失败' });
    }
  });
  app.post('/interview-questions', async (req, reply) => {
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

      // 找到或创建 interview
      let interview = (app as any).db
        .prepare(
          'SELECT id FROM interviews WHERE job_id=? AND user_id=? ORDER BY started_at DESC LIMIT 1',
        )
        .get(body.jobId, payload.uid);
      const now = Date.now();
      if (!interview) {
        const { randomUUID } = await import('crypto');
        const interviewId = randomUUID();
        (app as any).db
          .prepare(
            `INSERT INTO interviews (id, job_id, user_id, language, theme, started_at, ended_at) VALUES (?, ?, ?, 'zh', 'light', ?, NULL)`,
          )
          .run(interviewId, body.jobId, payload.uid, now);
        interview = { id: interviewId } as any;
      }

      const { randomUUID } = await import('crypto');
      const qid = randomUUID();
      (app as any).db
        .prepare(
          'INSERT INTO interview_questions (id, interview_id, question, answer, created_at, tag_id) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run(qid, interview.id, body.title, body.description || '', now, body.tagId || null);

      return { id: qid };
    } catch (err) {
      return reply.code(401).send({ error: '未认证' });
    }
  });
  // 分页查询：按 jobId 关联查询（interview_questions -> interviews）
  app.get('/interview-questions', async (req, reply) => {
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
      const where: string[] = ['i.user_id = ?', 'i.job_id = ?'];
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
             JOIN interviews i ON q.interview_id = i.id
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
                  q.tag_id,
                  t.name AS tag
             FROM interview_questions q
             JOIN interviews i ON q.interview_id = i.id
        LEFT JOIN tags t ON q.tag_id = t.id
            WHERE ${where.join(' AND ')}
            ORDER BY q.created_at DESC
            LIMIT ? OFFSET ?`,
        )
        .all(...args, pageSize, offset);
      return { items: rows, total };
    } catch (err) {
      return reply.code(401).send({ error: '未认证' });
    }
  });

  // 详情
  app.get('/interview-questions/:id', async (req, reply) => {
    try {
      const payload = await (req as any).jwtVerify();
      const id = (req as any).params?.id as string;
      const row = (app as any).db
        .prepare(
          `SELECT q.id,
                  q.question AS title,
                  q.answer   AS description,
                  q.created_at
             FROM interview_questions q
             JOIN interviews i ON q.interview_id = i.id
            WHERE q.id=? AND i.user_id = ?`,
        )
        .get(id, payload.uid);
      if (!row) return reply.code(404).send({ error: '不存在' });
      return { item: row };
    } catch (err) {
      return reply.code(401).send({ error: '未认证' });
    }
  });

  // 更新（编辑保存）：允许修改 title/description -> 对应 question/answer
  app.put('/interview-questions/:id', async (req, reply) => {
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
      // 校验归属
      const own = (app as any).db
        .prepare(
          `SELECT q.id FROM interview_questions q JOIN interviews i ON q.interview_id = i.id WHERE q.id=? AND i.user_id=?`,
        )
        .get(id, payload.uid);
      if (!own) return reply.code(404).send({ error: '不存在或无权限' });
      (app as any).db
        .prepare('UPDATE interview_questions SET question=?, answer=?, tag_id=? WHERE id=?')
        .run(body.title, body.description, body.tagId ?? null, id);
      return { success: true };
    } catch (err) {
      return reply.code(401).send({ error: '未认证' });
    }
  });

  // 删除
  app.delete('/interview-questions/:id', async (req, reply) => {
    try {
      const payload = await (req as any).jwtVerify();
      const id = (req as any).params?.id as string;
      // 校验归属
      const own = (app as any).db
        .prepare(
          `SELECT q.id FROM interview_questions q JOIN interviews i ON q.interview_id = i.id WHERE q.id=? AND i.user_id=?`,
        )
        .get(id, payload.uid);
      if (!own) return reply.code(404).send({ error: '不存在或无权限' });
      (app as any).db.prepare('DELETE FROM interview_questions WHERE id=?').run(id);
      return { success: true };
    } catch (err) {
      return reply.code(401).send({ error: '未认证' });
    }
  });
}
