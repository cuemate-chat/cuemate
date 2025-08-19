import { withErrorLogging } from '@cuemate/logger';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

/**
 * 统一的向量库删除接口：删除 Chroma 向量，并回写业务库 vector_status = 0
 * 用于“向量知识库”页面的删除动作
 */
export function registerVectorRoutes(app: FastifyInstance) {
  // 综合同步状态：岗位/简历/押题
  app.get(
    '/vectors/sync-status',
    withErrorLogging(app.log as any, 'vectors.sync-status', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const { jobId } = (req as any).query as { jobId?: string };

        if (jobId) {
          // 按岗位统计
          const owned = (app as any).db
            .prepare('SELECT id FROM jobs WHERE id=? AND user_id=?')
            .get(jobId, payload.uid);
          if (!owned) return reply.code(404).send({ error: '岗位不存在或无权限' });

          const jobRow = (app as any).db
            .prepare('SELECT vector_status FROM jobs WHERE id=?')
            .get(jobId) as { vector_status?: number } | undefined;
          const resumeRow = (app as any).db
            .prepare(
              'SELECT vector_status FROM resumes WHERE job_id=? ORDER BY created_at DESC LIMIT 1',
            )
            .get(jobId) as { vector_status?: number } | undefined;

          const totalQ = (app as any).db
            .prepare('SELECT COUNT(1) AS c FROM interview_questions WHERE job_id=?')
            .get(jobId)?.c as number;
          const syncedQ = (app as any).db
            .prepare(
              'SELECT COUNT(1) AS c FROM interview_questions WHERE job_id=? AND vector_status=1',
            )
            .get(jobId)?.c as number;

          return {
            job: { synced: !!jobRow?.vector_status },
            resume: { synced: !!resumeRow?.vector_status },
            questions: {
              total: totalQ || 0,
              synced: syncedQ || 0,
              unsynced: Math.max(0, (totalQ || 0) - (syncedQ || 0)),
            },
          };
        }

        // 汇总统计（当前用户所有数据）
        const totalJobs = (app as any).db
          .prepare('SELECT COUNT(1) AS c FROM jobs WHERE user_id=?')
          .get(payload.uid)?.c as number;
        const syncedJobs = (app as any).db
          .prepare('SELECT COUNT(1) AS c FROM jobs WHERE user_id=? AND vector_status=1')
          .get(payload.uid)?.c as number;

        const totalResumes = (app as any).db
          .prepare(
            'SELECT COUNT(1) AS c FROM resumes r JOIN jobs j ON r.job_id=j.id WHERE j.user_id=?',
          )
          .get(payload.uid)?.c as number;
        const syncedResumes = (app as any).db
          .prepare(
            'SELECT COUNT(1) AS c FROM resumes r JOIN jobs j ON r.job_id=j.id WHERE j.user_id=? AND r.vector_status=1',
          )
          .get(payload.uid)?.c as number;

        const totalQ = (app as any).db
          .prepare(
            'SELECT COUNT(1) AS c FROM interview_questions q JOIN jobs j ON q.job_id=j.id WHERE j.user_id=?',
          )
          .get(payload.uid)?.c as number;
        const syncedQ = (app as any).db
          .prepare(
            'SELECT COUNT(1) AS c FROM interview_questions q JOIN jobs j ON q.job_id=j.id WHERE j.user_id=? AND q.vector_status=1',
          )
          .get(payload.uid)?.c as number;

        return {
          job: {
            total: totalJobs || 0,
            synced: syncedJobs || 0,
            unsynced: Math.max(0, (totalJobs || 0) - (syncedJobs || 0)),
          },
          resume: {
            total: totalResumes || 0,
            synced: syncedResumes || 0,
            unsynced: Math.max(0, (totalResumes || 0) - (syncedResumes || 0)),
          },
          questions: {
            total: totalQ || 0,
            synced: syncedQ || 0,
            unsynced: Math.max(0, (totalQ || 0) - (syncedQ || 0)),
          },
        };
      } catch (err: any) {
        return reply.code(401).send({ error: '未认证:' + err });
      }
    }),
  );

  // 一键同步：岗位/简历/押题 三个模块一次性对齐
  app.post(
    '/vectors/sync-all',
    withErrorLogging(app.log as any, 'vectors.sync-all', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const body = z
          .object({ jobId: z.string().min(1).optional() })
          .parse((req as any).body || {});
        const rag = process.env.RAG_SERVICE_BASE || 'http://rag-service:3003';

        const processOneJob = async (job: any) => {
          const resume = (app as any).db
            .prepare(
              'SELECT id, title, content, created_at FROM resumes WHERE job_id=? ORDER BY created_at DESC LIMIT 1',
            )
            .get(job.id) as any;

          try {
            await fetch(`${rag}/jobs/${job.id}`, { method: 'DELETE' });
          } catch {}
          if (resume) {
            const resp = await fetch(`${rag}/jobs/process`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                job: {
                  id: job.id,
                  title: job.title,
                  description: job.description,
                  user_id: payload.uid,
                  created_at: job.created_at || Date.now(),
                },
                resume: {
                  id: resume.id,
                  title: resume.title || `${job.title}-简历`,
                  content: resume.content || '',
                  job_id: job.id,
                  user_id: payload.uid,
                  created_at: resume.created_at || Date.now(),
                },
              }),
            });
            if (resp.ok) {
              try {
                (app as any).db.prepare('UPDATE jobs SET vector_status=1 WHERE id=?').run(job.id);
                (app as any).db
                  .prepare('UPDATE resumes SET vector_status=1 WHERE id=?')
                  .run(resume.id);
              } catch {}
            }
          } else {
            try {
              await fetch(`${rag}/delete/by-filter`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ where: { jobId: job.id }, collection: 'resumes' }),
              });
            } catch {}
          }

          // questions
          const qRows: Array<{
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
            .all(job.id);

          let success = 0;
          let failed = 0;
          let deletedExtras = 0;
          for (const r of qRows) {
            try {
              await fetch(`${rag}/questions/${r.id}`, { method: 'DELETE' });
            } catch {}
            try {
              const resp = await fetch(`${rag}/questions/process`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                  question: {
                    id: r.id,
                    title: r.question,
                    description: r.answer || '',
                    job_id: job.id,
                    tag_id: r.tag_id,
                    tag_name: r.tag_name,
                    user_id: payload.uid,
                    created_at: r.created_at,
                  },
                }),
              });
              if (!resp.ok) throw new Error('rag write failed');
              (app as any).db
                .prepare('UPDATE interview_questions SET vector_status=1 WHERE id=?')
                .run(r.id);
              success++;
            } catch {
              failed++;
            }
          }
          try {
            const filterParam = encodeURIComponent(JSON.stringify({ jobId: job.id }));
            const listResp = await fetch(`${rag}/search/questions?filter=${filterParam}&k=10000`);
            if (listResp.ok) {
              const listJson: any = await listResp.json();
              const vecIds: string[] = Array.from(
                new Set(
                  (listJson?.results || [])
                    .map((d: any) => d?.metadata?.questionId)
                    .filter((id: any) => typeof id === 'string' && id.length > 0),
                ),
              );
              const dbIds = new Set(qRows.map((r) => r.id));
              for (const qid of vecIds) {
                if (!dbIds.has(qid)) {
                  try {
                    await fetch(`${rag}/questions/${qid}`, { method: 'DELETE' });
                    deletedExtras++;
                  } catch {}
                }
              }
            }
          } catch {}
          return { success, failed, deletedExtras };
        };

        const jobs: any[] = body.jobId
          ? [
              (app as any).db
                .prepare(
                  'SELECT id, title, description, created_at FROM jobs WHERE id=? AND user_id=?',
                )
                .get(body.jobId, payload.uid),
            ].filter(Boolean)
          : (app as any).db
              .prepare('SELECT id, title, description, created_at FROM jobs WHERE user_id=?')
              .all(payload.uid);

        if (!jobs.length) return { success: true, jobs: { count: 0 } };

        let totalSuccess = 0,
          totalFailed = 0,
          totalDeletedExtras = 0;
        for (const job of jobs) {
          const r = await processOneJob(job);
          totalSuccess += r.success;
          totalFailed += r.failed;
          totalDeletedExtras += r.deletedExtras;
        }

        return {
          success: true,
          jobs: { count: jobs.length },
          questions: {
            success: totalSuccess,
            failed: totalFailed,
            deletedExtras: totalDeletedExtras,
          },
        };
      } catch (err: any) {
        return reply.code(401).send({ error: '未认证:' + err });
      }
    }),
  );
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
