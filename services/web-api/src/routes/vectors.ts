import { withErrorLogging } from '@cuemate/logger';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

/**
 * 统一的向量库删除接口：删除 Chroma 向量，并回写业务库 vector_status = 0
 * 用于“向量知识库”页面的删除动作
 */
export function registerVectorRoutes(app: FastifyInstance) {
  app.post(
    '/vectors/delete',
    withErrorLogging(app.log as any, 'vectors.delete', async (req, reply) => {
      try {
        await (req as any).jwtVerify();
        const body = z
          .object({
            id: z.string().min(1),
            type: z.enum(['jobs', 'resumes', 'questions']).optional(),
          })
          .parse((req as any).body || {});

        const collection = body.type || 'default';

        // 先删除向量库
        const ragBase = process.env.RAG_SERVICE_BASE || 'http://rag-service:3003';
        const res = await fetch(`${ragBase}/delete/by-filter`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ where: { id: body.id }, collection }),
        });
        if (!res.ok) {
          const t = await res.text();
          return reply.code(500).send({ error: `删除向量库失败: ${t}` });
        }

        // 解析出业务主键 id（去掉前缀与 chunk）
        const parseEntityId = (fullId: string, prefix: string) => {
          const m = fullId.match(new RegExp(`^${prefix}:([^:]+)`));
          return m ? m[1] : fullId; // 兜底：如果不带前缀，直接返回
        };

        try {
          if (collection === 'jobs') {
            const jobId = parseEntityId(body.id, 'job');
            (app as any).db.prepare('UPDATE jobs SET vector_status=0 WHERE id=?').run(jobId);
          } else if (collection === 'resumes') {
            const resumeId = parseEntityId(body.id, 'resume');
            (app as any).db.prepare('UPDATE resumes SET vector_status=0 WHERE id=?').run(resumeId);
          } else if (collection === 'questions') {
            const qid = parseEntityId(body.id, 'question');
            (app as any).db
              .prepare('UPDATE interview_questions SET vector_status=0 WHERE id=?')
              .run(qid);
          }
        } catch (e) {
          app.log.warn({ err: e as any }, '回写 vector_status 失败');
        }

        return { success: true };
      } catch (err: any) {
        return reply.code(400).send({ error: err?.message || '请求参数错误' });
      }
    }),
  );
}
