import { withErrorLogging } from '@cuemate/logger';
import { randomUUID } from 'crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getRagServiceUrl, getLlmRouterUrl, SERVICE_CONFIG } from '../config/services.js';

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
          const base = getRagServiceUrl();
          app.log.info(
            `Syncing job ${jobId} to RAG service at ${base}${SERVICE_CONFIG.RAG_SERVICE.ENDPOINTS.JOBS_PROCESS}`,
          );

          const response = await fetch(
            getRagServiceUrl(SERVICE_CONFIG.RAG_SERVICE.ENDPOINTS.JOBS_PROCESS),
            {
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
            },
          );

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
                  r.id AS resumeId, r.title AS resumeTitle, r.content AS resumeContent,
                  COALESCE(q.question_count, 0) AS question_count
             FROM jobs j 
             LEFT JOIN resumes r ON r.job_id = j.id
             LEFT JOIN (
               SELECT job_id, COUNT(*) AS question_count 
               FROM interview_questions 
               GROUP BY job_id
             ) q ON q.job_id = j.id
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
        // 先删除旧数据
        await fetch(getRagServiceUrl(`${SERVICE_CONFIG.RAG_SERVICE.ENDPOINTS.JOBS_DELETE}/${id}`), {
          method: 'DELETE',
        });

        // 获取最新的简历信息
        const resumeRow = app.db
          .prepare('SELECT id, content FROM resumes WHERE job_id=? AND user_id=?')
          .get(id, payload.uid);

        if (resumeRow) {
          // 重新处理岗位和简历
          await fetch(getRagServiceUrl(SERVICE_CONFIG.RAG_SERVICE.ENDPOINTS.JOBS_PROCESS), {
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
      // 1. JWT验证
      let payload;
      try {
        payload = await req.jwtVerify();
        app.log.info(`User ${payload.uid} attempting to delete job`);
      } catch (jwtError) {
        app.log.error({ err: jwtError }, 'JWT verification failed');
        return reply.code(401).send({ error: 'JWT验证失败，请重新登录' });
      }

      // 2. 参数验证
      const id = (req.params as any)?.id as string;
      if (!id) {
        app.log.error('Job ID is missing from request params');
        return reply.code(400).send({ error: '岗位ID不能为空' });
      }

      app.log.info(`Starting cascading delete for job ${id} by user ${payload.uid}`);

      // 3. 开始事务
      let deleteResult;
      try {
        const transaction = app.db.transaction(() => {
          // 1. 删除面试押题数据
          const questionsDeleted = app.db
            .prepare('DELETE FROM interview_questions WHERE job_id=?')
            .run(id);

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
        deleteResult = transaction();
        app.log.info(`Database transaction completed for job ${id}:`, deleteResult);
      } catch (dbError: any) {
        app.log.error({ err: dbError }, `Database transaction failed for job ${id}`);
        return reply.code(500).send({ error: '数据库操作失败：' + dbError.message });
      }

      // 4. 删除向量库中的所有相关数据（岗位、简历、押题）
      try {
        app.log.info(`Attempting to delete vector data for job ${id} from ${getRagServiceUrl()}`);

        // 使用RAG服务的deleteJobData方法删除所有相关向量数据
        const response = await fetch(
          getRagServiceUrl(`${SERVICE_CONFIG.RAG_SERVICE.ENDPOINTS.JOBS_DELETE}/${id}`),
          {
            method: 'DELETE',
          },
        );

        if (response.ok) {
          app.log.info(`Successfully deleted all vector data for job ${id}`);
        } else {
          const errorText = await response.text();
          app.log.warn(`RAG service returned ${response.status}: ${errorText}`);
        }
      } catch (vectorError) {
        app.log.error({ err: vectorError }, `Failed to delete vector data for job ${id}`);
        // 即使向量库删除失败，也不影响数据库删除的成功
      }

      app.log.info(`Cascading delete completed for job ${id}:`, deleteResult);

      return {
        success: deleteResult.jobsDeleted > 0,
        deleted: deleteResult,
        message: `已删除岗位及 ${deleteResult.resumesDeleted} 条简历、${deleteResult.questionsDeleted} 条押题数据`,
      };
    } catch (err: any) {
      app.log.error({ err }, '删除岗位失败');
      // 不要返回401，除非确实是认证问题
      return reply.code(500).send({ error: '删除岗位失败：' + err.message });
    }
  });

  // 简历优化接口
  app.post('/jobs/optimize-resume', 
    withErrorLogging(app.log as any, 'jobs.optimize-resume', async (req: any, reply: any) => {
      try {
        await req.jwtVerify();
        const body = z.object({
          jobId: z.string(),
          resumeContent: z.string().min(1),
          jobDescription: z.string().min(1),
        }).parse(req.body);

        // 从用户表获取选中的模型ID
        const user = app.db.prepare('SELECT selected_model_id FROM users WHERE id = ?').get(payload.uid);
        if (!user || !user.selected_model_id) {
          return reply.code(400).send({ error: '用户未选择大模型，请先在设置中选择一个模型' });
        }

        // 获取模型信息
        const model = app.db.prepare('SELECT * FROM models WHERE id = ?').get(user.selected_model_id);
        if (!model) {
          return reply.code(400).send({ error: '所选模型不存在，请重新选择模型' });
        }

        const credentials = model.credentials ? JSON.parse(model.credentials) : {};
        
        // 构建优化提示词
        const optimizePrompt = `请对以下简历进行优化，使其更符合目标岗位要求。请提供：
1. 具体的优化建议
2. 优化后的完整简历内容

目标岗位描述：
${body.jobDescription}

当前简历内容：
${body.resumeContent}

请按照以下格式返回JSON：
{
  "suggestions": "详细的优化建议...",
  "optimizedResume": "优化后的完整简历内容..."
}`;

        // 根据模型提供商直接调用对应API
        let llmResponse: Response;
        const messages = [
          {
            role: 'system',
            content: '你是一个专业的简历优化助手，擅长根据岗位要求优化简历内容。'
          },
          {
            role: 'user', 
            content: optimizePrompt
          }
        ];

        if (model.provider === 'openai' || model.provider === 'deepseek' || model.provider === 'moonshot') {
          // OpenAI 兼容接口
          llmResponse = await fetch(`${credentials.base_url || credentials.baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${credentials.api_key || credentials.apiKey}`,
            },
            body: JSON.stringify({
              model: model.model_name,
              messages,
              temperature: 0.7,
              max_tokens: 2000,
            }),
          });
        } else {
          // 其他提供商暂时返回错误
          return reply.code(400).send({ error: `暂不支持 ${model.provider} 提供商的简历优化功能` });
        }

        if (!llmResponse.ok) {
          const errorText = await llmResponse.text();
          app.log.error(`LLM service error: ${llmResponse.status} - ${errorText}`);
          return reply.code(500).send({ error: `调用大模型服务失败: ${errorText}` });
        }

        const llmResult = await llmResponse.json() as any;
        const content = llmResult.choices?.[0]?.message?.content;

        if (!content) {
          return reply.code(500).send({ error: '大模型返回内容为空' });
        }

        // 尝试解析JSON格式的回复
        let result;
        try {
          result = JSON.parse(content);
        } catch (e) {
          // 如果不是JSON格式，则简单处理
          result = {
            suggestions: '优化建议：' + content.substring(0, 500),
            optimizedResume: content,
          };
        }

        return {
          success: true,
          suggestions: result.suggestions || '暂无具体建议',
          optimizedResume: result.optimizedResume || content,
        };

      } catch (err: any) {
        app.log.error({ err }, '简历优化失败');
        if (err.name === 'ZodError') {
          return reply.code(400).send({ error: '参数错误' });
        }
        return reply.code(500).send({ error: '简历优化失败：' + err.message });
      }
    })
  );
}
