import { randomUUID } from 'crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

export function registerPromptRoutes(app: FastifyInstance) {
  const upsertSchema = z.object({
    jobId: z.string().min(1),
    title: z.string().min(1),
    content: z.string().min(1),
  });

  // 需要认证：这里简化，通过 header 携带 Bearer token，示例不做细校验
  app.post('/prompts', async (req, reply) => {
    const auth = String(req.headers.authorization || '');
    if (!auth.startsWith('Bearer ')) return reply.code(401).send({ error: '未认证' });
    const token = auth.slice(7);
    const payload: any = app.jwt.decode(token);
    if (!payload?.uid) return reply.code(401).send({ error: '无效凭证' });

    const body = upsertSchema.parse(req.body);
    const id = randomUUID();
    const now = Date.now();

    const job = app.db
      .prepare('SELECT id FROM jobs WHERE id=? AND user_id=?')
      .get(body.jobId, payload.uid);
    if (!job) {
      return reply.code(400).send({ error: '岗位不存在或不属于当前用户' });
    }

    app.db
      .prepare(
        'INSERT INTO prompts (id, user_id, job_id, title, content, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(id, payload.uid, body.jobId, body.title, body.content, now);
    return { id };
  });

  app.get('/prompts', async (req, reply) => {
    const auth = String(req.headers.authorization || '');
    if (!auth.startsWith('Bearer ')) return reply.code(401).send({ error: '未认证' });
    const token = auth.slice(7);
    const payload: any = app.jwt.decode(token);
    if (!payload?.uid) return reply.code(401).send({ error: '无效凭证' });

    const jobId = (req.query as any)?.jobId as string | undefined;
    let rows: any[] = [];
    if (jobId) {
      rows = app.db
        .prepare(
          'SELECT id, job_id as jobId, title, content, created_at FROM prompts WHERE user_id=? AND job_id=? ORDER BY created_at DESC',
        )
        .all(payload.uid, jobId);
    } else {
      rows = app.db
        .prepare(
          'SELECT id, job_id as jobId, title, content, created_at FROM prompts WHERE user_id=? ORDER BY created_at DESC',
        )
        .all(payload.uid);
    }
    return { items: rows };
  });
}
