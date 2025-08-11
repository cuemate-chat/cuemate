import { randomUUID } from 'crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

export function registerJobRoutes(app: FastifyInstance) {
  const createSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(5000),
    resumeTitle: z.string().max(200).optional(),
    resumeContent: z.string().min(1).max(5000),
  });

  const handleCreate = async (req: any, reply: any) => {
    try {
      const payload = await req.jwtVerify();
      const body = createSchema.parse(req.body);
      const now = Date.now();
      const jobId = randomUUID();
      const resumeId = randomUUID();

      // 先创建岗位
      app.db
        .prepare(
          'INSERT INTO jobs (id, user_id, title, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run(jobId, payload.uid, body.title, body.description, 'active', now);

      // 再创建简历并指向岗位
      app.db
        .prepare(
          'INSERT INTO resumes (id, user_id, job_id, title, content, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run(
          resumeId,
          payload.uid,
          jobId,
          body.resumeTitle || `${body.title}-简历`,
          body.resumeContent,
          now,
        );

      return { jobId, resumeId };
    } catch (err) {
      return reply.code(401).send({ error: '未认证' });
    }
  };

  // 兼容两种路径
  app.post('/jobs/new', handleCreate);
  // 岗位列表 GET /jobs
  app.get('/jobs', async (req, reply) => {
    try {
      const payload = await req.jwtVerify();
      const rows = app.db
        .prepare(
          'SELECT id, title, description, status, created_at FROM jobs WHERE user_id = ? ORDER BY created_at DESC',
        )
        .all(payload.uid);
      return { items: rows };
    } catch (err) {
      return reply.code(401).send({ error: '未认证' });
    }
  });
}
