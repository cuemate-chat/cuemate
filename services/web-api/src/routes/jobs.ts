import { withErrorLogging } from '@cuemate/logger';
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
  const updateSchema = createSchema;

  const handleCreate = withErrorLogging(
    app.log as any,
    'jobs.create',
    async (req: any, reply: any) => {
      try {
        const payload = await req.jwtVerify();
        const body = createSchema.parse(req.body);
        const now = Date.now();
        const jobId = randomUUID();
        const resumeId = randomUUID();

        // 先创建岗位
        app.db
          .prepare(
            'INSERT INTO jobs (id, user_id, title, description, status, created_at, vector_status) VALUES (?, ?, ?, ?, ?, ?, 0)',
          )
          .run(jobId, payload.uid, body.title, body.description, 'active', now);

        // 再创建简历并指向岗位
        app.db
          .prepare(
            'INSERT INTO resumes (id, user_id, job_id, title, content, created_at, vector_status) VALUES (?, ?, ?, ?, ?, ?, 0)',
          )
          .run(
            resumeId,
            payload.uid,
            jobId,
            body.resumeTitle || `${body.title}-简历`,
            body.resumeContent,
            now,
          );

        // 同步到 rag-service
        try {
          const base = process.env.RAG_SERVICE_BASE || 'http://rag-service:3003';
          app.log.info(`Syncing job ${jobId} to RAG service at ${base}/jobs/process`);

          const response = await fetch(`${base}/jobs/process`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              job: {
                id: jobId,
                title: body.title,
                description: body.description,
                user_id: payload.uid,
                created_at: now,
              },
              resume: {
                id: resumeId,
                title: body.resumeTitle || `${body.title}-简历`,
                content: body.resumeContent,
                job_id: jobId,
                user_id: payload.uid,
                created_at: now,
              },
            }),
          });

          if (response.ok) {
            const result = await response.json();
            app.log.info(
              `Successfully synced job ${jobId} to RAG service: ${JSON.stringify(result)}`,
            );
            try {
              app.db.prepare('UPDATE jobs SET vector_status=1 WHERE id=?').run(jobId);
              app.db.prepare('UPDATE resumes SET vector_status=1 WHERE id=?').run(resumeId);
            } catch {}
          } else {
            const errorText = await response.text();
            app.log.error(
              `Failed to sync job ${jobId} to RAG service: ${response.status} ${errorText}`,
            );
          }
        } catch (error) {
          app.log.error({ err: error as any }, `Failed to sync job ${jobId} to RAG service`);
        }

        return { jobId, resumeId };
      } catch (err) {
        // 记录详细错误信息到日志
        app.log.error({ err }, '岗位创建失败');
        return reply.code(401).send({ error: '未认证：' + err });
      }
    },
  );

  app.post('/jobs/new', handleCreate);
  // 岗位列表 GET /jobs（联表返回简历，前端一次性拿到详情）
  app.get('/jobs', async (req, reply) => {
    try {
      const payload = await req.jwtVerify();
      const rows = app.db
        .prepare(
          `SELECT j.id, j.title, j.description, j.status, j.created_at, j.vector_status,
                  r.id AS resumeId, r.title AS resumeTitle, r.content AS resumeContent
             FROM jobs j LEFT JOIN resumes r ON r.job_id = j.id
            WHERE j.user_id = ?
            ORDER BY j.created_at DESC`,
        )
        .all(payload.uid);
      return { items: rows };
    } catch (err) {
      app.log.error({ err }, '获取岗位列表失败');
      return reply.code(401).send({ error: '未认证：' + err });
    }
  });

  // 岗位详情 GET /jobs/:id
  app.get('/jobs/:id', async (req, reply) => {
    try {
      const payload = await req.jwtVerify();
      const id = (req.params as any)?.id as string;
      const row = app.db
        .prepare(
          `SELECT j.id, j.title, j.description, j.status, j.created_at, j.vector_status,
                  r.id AS resumeId, r.title AS resumeTitle, r.content AS resumeContent
             FROM jobs j LEFT JOIN resumes r ON r.job_id = j.id
            WHERE j.id = ? AND j.user_id = ?`,
        )
        .get(id, payload.uid);
      if (!row) return reply.code(404).send({ error: '岗位不存在' });
      return { job: row };
    } catch (err) {
      app.log.error({ err }, '获取岗位详情失败');
      return reply.code(401).send({ error: '未认证：' + err });
    }
  });

  // 更新岗位与简历 PUT /jobs/:id
  app.put('/jobs/:id', async (req, reply) => {
    try {
      const payload = await req.jwtVerify();
      const id = (req.params as any)?.id as string;
      const body = updateSchema.parse(req.body);
      // 先检查归属
      const owned = app.db
        .prepare('SELECT id FROM jobs WHERE id = ? AND user_id = ?')
        .get(id, payload.uid);
      if (!owned) return reply.code(404).send({ error: '岗位不存在' });

      app.db
        .prepare('UPDATE jobs SET title=?, description=?, vector_status=0 WHERE id=? AND user_id=?')
        .run(body.title, body.description, id, payload.uid);
      // 简历若不存在则补一条
      const r = app.db
        .prepare('SELECT id FROM resumes WHERE job_id=? AND user_id=?')
        .get(id, payload.uid);
      if (r) {
        app.db
          .prepare(
            'UPDATE resumes SET title=?, content=?, vector_status=0 WHERE id=? AND user_id=?',
          )
          .run(body.resumeTitle || `${body.title}-简历`, body.resumeContent, r.id, payload.uid);
      } else {
        const resumeId = randomUUID();
        const now = Date.now();
        app.db
          .prepare(
            'INSERT INTO resumes (id, user_id, job_id, title, content, created_at, vector_status) VALUES (?, ?, ?, ?, ?, ?, 0)',
          )
          .run(
            resumeId,
            payload.uid,
            id,
            body.resumeTitle || `${body.title}-简历`,
            body.resumeContent,
            now,
          );
      }

      // 同步到 rag-service（先删除旧，再写新）
      try {
        const base = process.env.RAG_SERVICE_BASE || 'http://rag-service:3003';

        // 先删除旧数据
        await fetch(`${base}/jobs/${id}`, {
          method: 'DELETE',
        });

        // 获取最新的简历信息
        const resumeRow = app.db
          .prepare('SELECT id, content FROM resumes WHERE job_id=? AND user_id=?')
          .get(id, payload.uid);

        if (resumeRow) {
          // 重新处理岗位和简历
          await fetch(`${base}/jobs/process`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              job: {
                id,
                title: body.title,
                description: body.description,
                user_id: payload.uid,
                created_at: Date.now(),
              },
              resume: {
                id: resumeRow.id,
                title: body.resumeTitle || `${body.title}-简历`,
                content: resumeRow.content,
                job_id: id,
                user_id: payload.uid,
                created_at: Date.now(),
              },
            }),
          });
          try {
            app.db.prepare('UPDATE jobs SET vector_status=1 WHERE id=?').run(id);
            app.db.prepare('UPDATE resumes SET vector_status=1 WHERE id=?').run(resumeRow.id);
          } catch {}
        }
      } catch (error) {
        app.log.error({ err: error }, 'Failed to sync to RAG service');
      }

      return { success: true };
    } catch (err) {
      app.log.error({ err }, '更新岗位失败');
      return reply.code(401).send({ error: '未认证：' + err });
    }
  });

  // 删除岗位 DELETE /jobs/:id（级联删除简历、押题、向量库数据）
  app.delete('/jobs/:id', async (req, reply) => {
    try {
      const payload = await req.jwtVerify();
      const id = (req.params as any)?.id as string;

      // 开始事务
      const transaction = app.db.transaction(() => {
        // 1. 删除面试押题数据
        const questionsDeleted = app.db
          .prepare('DELETE FROM interview_questions WHERE job_id=? AND user_id=?')
          .run(id, payload.uid);

        // 2. 删除简历数据
        const resumesDeleted = app.db
          .prepare('DELETE FROM resumes WHERE job_id=? AND user_id=?')
          .run(id, payload.uid);

        // 3. 删除岗位数据
        const jobsDeleted = app.db
          .prepare('DELETE FROM jobs WHERE id=? AND user_id=?')
          .run(id, payload.uid);

        return {
          questionsDeleted: questionsDeleted.changes,
          resumesDeleted: resumesDeleted.changes,
          jobsDeleted: jobsDeleted.changes,
        };
      });

      // 执行事务
      const deleteResult = transaction();

      // 4. 删除向量库中的所有相关数据（岗位、简历、押题）
      try {
        const base = process.env.RAG_SERVICE_BASE || 'http://rag-service:3003';

        // 使用RAG服务的deleteJobData方法删除所有相关向量数据
        await fetch(`${base}/jobs/${id}`, {
          method: 'DELETE',
        });

        app.log.info(`Successfully deleted all vector data for job ${id}`);
      } catch (error) {
        app.log.error({ err: error }, `Failed to delete vector data for job ${id}`);
        // 即使向量库删除失败，也不影响数据库删除的成功
      }

      app.log.info(`Cascading delete completed for job ${id}:`, deleteResult);

      return {
        success: deleteResult.jobsDeleted > 0,
        deleted: deleteResult,
        message: `已删除岗位及 ${deleteResult.resumesDeleted} 条简历、${deleteResult.questionsDeleted} 条押题数据`,
      };
    } catch (err) {
      app.log.error({ err }, '删除岗位失败');
      return reply.code(401).send({ error: '未认证：' + err });
    }
  });
}
