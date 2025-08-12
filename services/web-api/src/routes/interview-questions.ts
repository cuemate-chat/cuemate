import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

export function registerInterviewQuestionRoutes(app: FastifyInstance) {
  // 分页查询：按 jobId 关联查询（interview_questions -> interviews）
  app.get('/interview-questions', async (req, reply) => {
    try {
      const payload = await (req as any).jwtVerify();
      const schema = z.object({
        jobId: z.string().min(1),
        page: z.coerce.number().min(1).default(1),
        pageSize: z.coerce.number().min(1).max(100).default(6),
      });
      const { jobId, page, pageSize } = schema.parse((req as any).query || {});
      const offset = (page - 1) * pageSize;

      const totalRow = (app as any).db
        .prepare(
          `SELECT COUNT(1) as cnt
             FROM interview_questions q
             JOIN interviews i ON q.interview_id = i.id
            WHERE i.user_id = ? AND i.job_id = ?`,
        )
        .get(payload.uid, jobId);
      const total = totalRow?.cnt ?? 0;

      const rows = (app as any).db
        .prepare(
          `SELECT q.id,
                  q.question AS title,
                  q.answer   AS description,
                  q.created_at
             FROM interview_questions q
             JOIN interviews i ON q.interview_id = i.id
            WHERE i.user_id = ? AND i.job_id = ?
            ORDER BY q.created_at DESC
            LIMIT ? OFFSET ?`,
        )
        .all(payload.uid, jobId, pageSize, offset);
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
        .object({ title: z.string().min(1).max(200), description: z.string().min(1).max(5000) })
        .parse((req as any).body || {});
      // 校验归属
      const own = (app as any).db
        .prepare(
          `SELECT q.id FROM interview_questions q JOIN interviews i ON q.interview_id = i.id WHERE q.id=? AND i.user_id=?`,
        )
        .get(id, payload.uid);
      if (!own) return reply.code(404).send({ error: '不存在或无权限' });
      (app as any).db
        .prepare('UPDATE interview_questions SET question=?, answer=? WHERE id=?')
        .run(body.title, body.description, id);
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
