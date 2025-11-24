import { CONTAINER_BASE_DIR, CONTAINER_PDF_DIR } from '@cuemate/config';
import { withErrorLogging } from '@cuemate/logger';
import { randomUUID } from 'crypto';
import type { FastifyInstance } from 'fastify';
import { promises as fs } from 'fs';
import mammoth from 'mammoth';
import path from 'path';
import { z } from 'zod';
import { getRagServiceUrl, SERVICE_CONFIG } from '../config/services.js';
import { buildPrefixedError } from '../utils/error-response.js';
import { logOperation, OPERATION_MAPPING } from '../utils/operation-logger-helper.js';
import { OperationType } from '../utils/operation-logger.js';
import { deleteNotificationsByResourceId, notifyJobCreated } from '../utils/notification-helper.js';

export function registerJobRoutes(app: FastifyInstance) {
  const createSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(5000),
    resumeTitle: z.string().max(200).optional(),
    resumeContent: z.string().min(1).max(5000),
    resumeFilePath: z.string().optional(),
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
            'INSERT INTO resumes (id, user_id, job_id, title, content, file_path, created_at, vector_status) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
          )
          .run(
            resumeId,
            payload.uid,
            jobId,
            body.resumeTitle || `${body.title}-简历`,
            body.resumeContent,
            body.resumeFilePath || null,
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
                  file_path: body.resumeFilePath,
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

        // 记录操作日志
        await logOperation(app, req, {
          ...OPERATION_MAPPING.JOB,
          resourceId: jobId,
          resourceName: body.title,
          operation: OperationType.CREATE,
          message: `创建面试任务: ${body.title}`,
          status: 'success',
          userId: payload.uid
        });

        // 发送通知
        try {
          notifyJobCreated(app.db, payload.uid, jobId, body.title);
        } catch (notifyError) {
          app.log.error({ err: notifyError }, '发送岗位创建通知失败');
        }

        return { jobId, resumeId };
      } catch (err: any) {
        // 记录详细错误信息到日志
        app.log.error({ err }, '岗位创建失败');
        return reply.code(401).send(buildPrefixedError('岗位创建失败', err, 401));
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
                  r.id AS resumeId, r.title AS resumeTitle, r.content AS resumeContent, r.file_path AS resumeFilePath,
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
    } catch (err: any) {
      app.log.error({ err }, '获取岗位列表失败');
      return reply.code(401).send(buildPrefixedError('获取岗位列表失败', err, 401));
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
                  r.id AS resumeId, r.title AS resumeTitle, r.content AS resumeContent, r.file_path AS resumeFilePath
             FROM jobs j LEFT JOIN resumes r ON r.job_id = j.id
            WHERE j.id = ? AND j.user_id = ?`,
        )
        .get(id, payload.uid);
      if (!row) return reply.code(404).send({ error: '岗位不存在' });
      return { job: row };
    } catch (err: any) {
      app.log.error({ err }, '获取岗位详情失败');
      return reply.code(401).send(buildPrefixedError('获取岗位详情失败', err, 401));
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
        // 只有当 resumeFilePath 有值时才更新 file_path,避免覆盖原有值
        if (body.resumeFilePath !== undefined && body.resumeFilePath !== null) {
          app.db
            .prepare(
              'UPDATE resumes SET title=?, content=?, file_path=?, vector_status=0 WHERE id=? AND user_id=?',
            )
            .run(body.resumeTitle || `${body.title}-简历`, body.resumeContent, body.resumeFilePath, r.id, payload.uid);
        } else {
          app.db
            .prepare(
              'UPDATE resumes SET title=?, content=?, vector_status=0 WHERE id=? AND user_id=?',
            )
            .run(body.resumeTitle || `${body.title}-简历`, body.resumeContent, r.id, payload.uid);
        }
      } else {
        const resumeId = randomUUID();
        const now = Date.now();
        app.db
          .prepare(
            'INSERT INTO resumes (id, user_id, job_id, title, content, file_path, created_at, vector_status) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
          )
          .run(
            resumeId,
            payload.uid,
            id,
            body.resumeTitle || `${body.title}-简历`,
            body.resumeContent,
            body.resumeFilePath || null,
            now,
          );
      }

      // 同步到 rag-service（先删除旧，再写新）
      try {
        // 先删除旧数据
        await fetch(getRagServiceUrl(`${SERVICE_CONFIG.RAG_SERVICE.ENDPOINTS.JOBS_DELETE}/${id}`), {
          method: 'DELETE',
        });

        // 获取最新的简历信息(包括 title)
        const resumeRow = app.db
          .prepare('SELECT id, title, content, file_path FROM resumes WHERE job_id=? AND user_id=?')
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
                title: resumeRow.title,
                content: resumeRow.content,
                file_path: resumeRow.file_path,
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

      // 记录操作日志
      await logOperation(app, req, {
        ...OPERATION_MAPPING.JOB,
        resourceId: id,
        resourceName: body.title,
        operation: OperationType.UPDATE,
        message: `更新面试任务: ${body.title}`,
        status: 'success',
        userId: payload.uid
      });

      return { success: true };
    } catch (err: any) {
      app.log.error({ err }, '更新岗位失败');
      return reply.code(401).send(buildPrefixedError('更新岗位失败', err, 401));
    }
  });

  // 工具函数：将流转换为 Buffer
  async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk);
      } else {
        chunks.push(Buffer.from(chunk));
      }
    }
    return Buffer.concat(chunks);
  }

  // 上传简历文件到指定岗位 POST /jobs/:id/upload-resume
  app.post('/jobs/:id/upload-resume', async (req: any, reply) => {
    let text = '';
    let savedFilePath = '';

    try {
      // JWT 认证检查
      const payload = await req.jwtVerify();
      const jobId = (req.params as any)?.id as string;

      if (!jobId) {
        return reply
          .code(400)
          .send(buildPrefixedError('简历上传失败', new Error('岗位 ID 不能为空'), 400));
      }

      // 检查岗位是否存在且属于当前用户
      const job = app.db
        .prepare('SELECT id, title, description, created_at FROM jobs WHERE id = ? AND user_id = ?')
        .get(jobId, payload.uid);

      if (!job) {
        return reply.code(404).send({ error: '岗位不存在' });
      }

      // 获取上传的文件
      const file = await req.file();
      if (!file) {
        return reply
          .code(400)
          .send(buildPrefixedError('简历上传失败', new Error('缺少文件，请选择要上传的简历文件'), 400));
      }

      const mimetype: string = file.mimetype || '';
      const filename: string = file.filename || '';
      const lower = filename.toLowerCase();

      app.log.info({ jobId, filename, mimetype }, '开始处理岗位简历上传');

      const buf = await streamToBuffer(file.file);

      // 保存原始文件到 /opt/cuemate/pdf 目录
      try {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '');
        const extension = path.extname(filename) || '.pdf';
        const nameWithoutExt = path.basename(filename, extension);
        const newFilename = `${nameWithoutExt}_${timestamp}${extension}`;

        const pdfDir = CONTAINER_PDF_DIR;
        await fs.mkdir(pdfDir, { recursive: true });

        const filePath = path.join(pdfDir, newFilename);
        await fs.writeFile(filePath, buf);
        savedFilePath = `/pdf/${newFilename}`;

        app.log.info({ filename, newFilename, filePath, size: buf.length }, '原始文件已保存');
      } catch (saveError: any) {
        app.log.error({ err: saveError, filename }, '保存原始文件失败');
        return reply
          .code(500)
          .send(buildPrefixedError('简历上传失败', new Error('保存文件失败'), 500));
      }

      // 解析文件内容
      if (mimetype === 'application/pdf' || lower.endsWith('.pdf')) {
        try {
          if (buf.length < 4 || buf.toString('ascii', 0, 4) !== '%PDF') {
            throw new Error('无效的 PDF 文件格式');
          }

          const PDFParser = (await import('pdf2json')).default;

          text = await new Promise((resolve, reject) => {
            const pdfParser = new PDFParser();

            pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
              try {
                const pages = pdfData.Pages || [];
                const textContent = pages
                  .map((page: any) => {
                    const texts = page.Texts || [];
                    return texts
                      .map((text: any) => {
                        const decodedText = decodeURIComponent(text.R[0].T);
                        return decodedText;
                      })
                      .join(' ');
                  })
                  .join('\n');

                const extractedText = textContent.trim();

                if (extractedText && extractedText.length > 5) {
                  app.log.info(
                    { filename, textLength: extractedText.length, pages: pages.length },
                    'PDF 解析完成',
                  );
                  resolve(extractedText);
                } else {
                  reject(new Error('提取的文本内容过少'));
                }
              } catch (parseError: any) {
                reject(new Error(`PDF 解析失败：${parseError.message}`));
              }
            });

            pdfParser.on('pdfParser_dataError', (err: any) => {
              reject(new Error(`PDF 数据错误：${err.message}`));
            });

            pdfParser.parseBuffer(buf);
          });
        } catch (pdfError: any) {
          app.log.error({ err: pdfError, filename }, 'PDF 解析失败');
          return reply
            .code(422)
            .send(buildPrefixedError('简历上传失败', new Error(`PDF 文件解析失败：${pdfError.message}`), 422));
        }
      } else if (
        mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        lower.endsWith('.docx')
      ) {
        try {
          const res = await mammoth.extractRawText({ buffer: buf });
          text = (res.value || '').trim();
          app.log.info({ filename, textLength: text.length }, 'DOCX 解析完成');
        } catch (docxError: any) {
          app.log.error({ err: docxError, filename }, 'DOCX 解析失败');
          return reply
            .code(422)
            .send(buildPrefixedError('简历上传失败', new Error(`DOCX 文件解析失败：${docxError.message}`), 422));
        }
      } else if (mimetype === 'application/msword' || lower.endsWith('.doc')) {
        try {
          const res = await mammoth.extractRawText({ buffer: buf });
          text = (res.value || '').trim();
          app.log.info({ filename, textLength: text.length }, 'DOC 解析完成');

          if (!text || text.length < 10) {
            return reply
              .code(422)
              .send(
                buildPrefixedError(
                  '简历上传失败',
                  new Error('此 DOC 文件可能是较老的格式，建议转换为 DOCX 格式后重新上传'),
                  422,
                ),
              );
          }
        } catch (docError: any) {
          app.log.error({ err: docError, filename }, 'DOC 解析失败');
          return reply
            .code(422)
            .send(buildPrefixedError('简历上传失败', new Error(`DOC 文件解析失败：${docError.message}`), 422));
        }
      } else {
        return reply
          .code(415)
          .send(
            buildPrefixedError(
              '简历上传失败',
              new Error(`不支持的文件类型：${mimetype || '未知格式'}。仅支持 PDF、DOC 和 DOCX 格式。`),
              415,
            ),
          );
      }

      if (!text || text.length < 5) {
        return reply
          .code(422)
          .send(
            buildPrefixedError(
              '简历上传失败',
              new Error(`文件解析成功但未提取到有效文本内容（长度: ${text.length}字符）`),
              422,
            ),
          );
      }

      app.log.info({ jobId, savedFilePath, textLength: text.length }, '文件解析成功，开始更新数据库');

      // 查询该岗位对应的简历记录
      const resume = app.db
        .prepare('SELECT id, title FROM resumes WHERE job_id = ? AND user_id = ?')
        .get(jobId, payload.uid);

      if (!resume) {
        return reply
          .code(404)
          .send(buildPrefixedError('简历上传失败', new Error('未找到该岗位的简历记录'), 404));
      }

      // 更新简历内容和文件路径，重置向量状态
      app.db
        .prepare(
          'UPDATE resumes SET content = ?, file_path = ?, vector_status = 0 WHERE id = ? AND user_id = ?',
        )
        .run(text, savedFilePath, resume.id, payload.uid);

      app.log.info({ resumeId: resume.id, jobId, filePath: savedFilePath }, '简历数据库记录已更新');

      // 同步到 RAG 服务
      try {
        // 先删除旧的向量数据
        await fetch(getRagServiceUrl(`${SERVICE_CONFIG.RAG_SERVICE.ENDPOINTS.JOBS_DELETE}/${jobId}`), {
          method: 'DELETE',
        });

        // 重新处理岗位和简历
        const ragResponse = await fetch(
          getRagServiceUrl(SERVICE_CONFIG.RAG_SERVICE.ENDPOINTS.JOBS_PROCESS),
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              job: {
                id: job.id,
                title: job.title,
                description: job.description,
                user_id: payload.uid,
                created_at: job.created_at,
              },
              resume: {
                id: resume.id,
                title: resume.title,
                content: text,
                file_path: savedFilePath,
                job_id: jobId,
                user_id: payload.uid,
                created_at: Date.now(),
              },
            }),
          },
        );

        if (ragResponse.ok) {
          app.log.info({ jobId, resumeId: resume.id }, '向量库同步成功');
          // 更新向量同步状态
          app.db.prepare('UPDATE jobs SET vector_status = 1 WHERE id = ?').run(jobId);
          app.db.prepare('UPDATE resumes SET vector_status = 1 WHERE id = ?').run(resume.id);
        } else {
          const errorText = await ragResponse.text();
          app.log.error({ jobId, error: errorText }, '向量库同步失败');
        }
      } catch (ragError: any) {
        app.log.error({ err: ragError, jobId }, '同步 RAG 服务失败');
        // 不中断流程，继续返回成功
      }

      // 记录操作日志
      await logOperation(app, req, {
        ...OPERATION_MAPPING.JOB,
        resourceId: jobId,
        resourceName: job.title,
        operation: OperationType.UPDATE,
        message: `上传简历文件: ${filename}`,
        status: 'success',
        userId: payload.uid,
      });

      return {
        success: true,
        message: '简历上传成功',
        filePath: savedFilePath,
        textLength: text.length,
      };
    } catch (err: any) {
      app.log.error({ err }, '简历上传失败');
      return reply.code(500).send(buildPrefixedError('简历上传失败', err, 500));
    }
  });

  // 删除岗位的简历文件 DELETE /jobs/:id/resume-file
  app.delete('/jobs/:id/resume-file', async (req, reply) => {
    try {
      const payload = await req.jwtVerify();
      const jobId = (req.params as any)?.id as string;

      if (!jobId) {
        return reply
          .code(400)
          .send(buildPrefixedError('删除失败', new Error('岗位 ID 不能为空'), 400));
      }

      // 检查岗位是否存在且属于当前用户
      const job = app.db
        .prepare('SELECT id FROM jobs WHERE id = ? AND user_id = ?')
        .get(jobId, payload.uid);

      if (!job) {
        return reply.code(404).send({ error: '岗位不存在' });
      }

      // 查询该岗位对应的简历记录
      const resume = app.db
        .prepare('SELECT id, file_path FROM resumes WHERE job_id = ? AND user_id = ?')
        .get(jobId, payload.uid);

      if (!resume) {
        return reply
          .code(404)
          .send(buildPrefixedError('删除失败', new Error('未找到该岗位的简历记录'), 404));
      }

      const oldFilePath = resume.file_path;

      // 更新数据库，清空 file_path
      app.db
        .prepare('UPDATE resumes SET file_path = NULL WHERE id = ? AND user_id = ?')
        .run(resume.id, payload.uid);

      app.log.info({ resumeId: resume.id, jobId, oldFilePath }, '简历文件路径已清空');

      // 删除物理文件
      if (oldFilePath) {
        try {
          const fullPath = path.join(CONTAINER_BASE_DIR, oldFilePath);
          await fs.unlink(fullPath);
          app.log.info({ filePath: fullPath }, '简历文件已删除');
        } catch (fileError: any) {
          app.log.warn({ err: fileError, filePath: oldFilePath }, '删除文件失败（可能文件不存在）');
          // 不中断流程，数据库已更新
        }
      }

      // 记录操作日志
      await logOperation(app, req, {
        ...OPERATION_MAPPING.JOB,
        resourceId: jobId,
        resourceName: `删除简历文件`,
        operation: OperationType.DELETE,
        message: `删除简历文件: ${oldFilePath || '无'}`,
        status: 'success',
        userId: payload.uid,
      });

      return {
        success: true,
        message: '简历文件已删除',
      };
    } catch (err: any) {
      app.log.error({ err }, '删除简历文件失败');
      return reply.code(500).send(buildPrefixedError('删除简历文件失败', err, 500));
    }
  });

  // 删除岗位 DELETE /jobs/:id（级联删除简历、押题、向量库数据）
  app.delete('/jobs/:id', async (req, reply) => {
    try {
      // 1. JWT 验证
      let payload;
      try {
        payload = await req.jwtVerify();
        app.log.info(`User ${payload.uid} attempting to delete job`);
      } catch (jwtError: any) {
        app.log.error({ err: jwtError }, 'JWT verification failed');
        return reply.code(401).send(buildPrefixedError('JWT 验证失败', jwtError, 401));
      }

      // 2. 参数验证
      const id = (req.params as any)?.id as string;
      if (!id) {
        app.log.error('Job ID is missing from request params');
        return reply
          .code(400)
          .send(buildPrefixedError('岗位删除失败', new Error('岗位 ID 不能为空'), 400));
      }

      app.log.info(`Starting cascading delete for job ${id} by user ${payload.uid}`);

      // 3. 获取任务信息（用于记录操作日志）
      const jobInfo = app.db
        .prepare('SELECT title FROM jobs WHERE id=? AND user_id=?')
        .get(id, payload.uid);
      
      if (!jobInfo) {
        app.log.error(`Job ${id} not found for user ${payload.uid}`);
        return reply.code(404).send({ error: '岗位不存在' });
      }

      // 4. 开始事务
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

          // 4. 删除相关通知
          const notificationsDeleted = deleteNotificationsByResourceId(app.db, id);

          return {
            questionsDeleted: questionsDeleted.changes,
            resumesDeleted: resumesDeleted.changes,
            jobsDeleted: jobsDeleted.changes,
            notificationsDeleted,
          };
        });

        // 执行事务
        deleteResult = transaction();
        app.log.info(`Database transaction completed for job ${id}:`, deleteResult);
      } catch (dbError: any) {
        app.log.error({ err: dbError }, `Database transaction failed for job ${id}`);
        return reply.code(500).send(buildPrefixedError('删除岗位失败', dbError, 500));
      }

      // 4. 删除向量库中的所有相关数据（岗位、简历、押题）
      try {
        app.log.info(`Attempting to delete vector data for job ${id} from ${getRagServiceUrl()}`);

        // 使用 RAG 服务的 deleteJobData 方法删除所有相关向量数据
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

      // 记录操作日志
      if (deleteResult.jobsDeleted > 0) {
        await logOperation(app, req, {
          ...OPERATION_MAPPING.JOB,
          resourceId: id,
          resourceName: jobInfo.title,
          operation: OperationType.DELETE,
          message: `删除面试任务: ${jobInfo.title}`,
          status: 'success',
          userId: payload.uid
        });
      }

      return {
        success: deleteResult.jobsDeleted > 0,
        deleted: deleteResult,
        message: `已删除岗位及 ${deleteResult.resumesDeleted} 条简历、${deleteResult.questionsDeleted} 条押题数据、${deleteResult.notificationsDeleted} 条相关通知`,
      };
    } catch (err: any) {
      app.log.error({ err }, '删除岗位失败');
      // 不要返回 401，除非确实是认证问题
      return reply.code(500).send(buildPrefixedError('删除岗位失败', err, 500));
    }
  });

  // 获取岗位的简历优化记录列表 GET /jobs/:jobId/resume-optimizations
  app.get('/jobs/:jobId/resume-optimizations', async (req, reply) => {
    try {
      const payload = await req.jwtVerify();
      const jobId = (req.params as any)?.jobId as string;

      // 检查岗位是否存在且属于当前用户
      const job = app.db
        .prepare('SELECT id FROM jobs WHERE id = ? AND user_id = ?')
        .get(jobId, payload.uid);

      if (!job) {
        return reply.code(404).send({ error: '岗位不存在' });
      }

      // 获取简历优化记录列表
      const optimizations = app.db
        .prepare(
          `SELECT id, created_at, updated_at, status, original_resume, original_word_count,
                  optimized_resume, optimized_word_count, model_id, model_name, suggestion,
                  optimization_count, error_message
           FROM resume_optimizations
           WHERE job_id = ? AND user_id = ?
           ORDER BY created_at DESC`
        )
        .all(jobId, payload.uid);

      return { items: optimizations };
    } catch (err: any) {
      app.log.error({ err }, '获取简历优化记录列表失败');
      return reply.code(500).send(buildPrefixedError('获取简历优化记录列表失败', err, 500));
    }
  });

  // 获取单个简历优化记录详情 GET /resume-optimizations/:id
  app.get('/resume-optimizations/:id', async (req, reply) => {
    try {
      const payload = await req.jwtVerify();
      const id = (req.params as any)?.id as string;

      // 获取简历优化记录
      const optimization = app.db
        .prepare(
          `SELECT id, created_at, updated_at, status, original_resume, original_word_count,
                  optimized_resume, optimized_word_count, model_id, model_name, suggestion,
                  optimization_count, error_message, job_id
           FROM resume_optimizations
           WHERE id = ? AND user_id = ?`
        )
        .get(id, payload.uid);

      if (!optimization) {
        return reply.code(404).send({ error: '简历优化记录不存在' });
      }

      return { optimization };
    } catch (err: any) {
      app.log.error({ err }, '获取简历优化记录详情失败');
      return reply.code(500).send(buildPrefixedError('获取简历优化记录详情失败', err, 500));
    }
  });

  // 创建新的简历优化记录 POST /jobs/:jobId/resume-optimizations
  app.post('/jobs/:jobId/resume-optimizations', async (req, reply) => {
    try {
      const payload = await req.jwtVerify();
      const jobId = (req.params as any)?.jobId as string;
      const body = z.object({
        originalResume: z.string().min(1),
        optimizedResume: z.string().optional(),
        suggestion: z.string().optional(),
        modelId: z.string().optional(),
        modelName: z.string().optional(),
        status: z.enum(['pending', 'processing', 'completed', 'failed']).default('pending'),
        errorMessage: z.string().optional(),
      }).parse(req.body);

      // 检查岗位是否存在且属于当前用户
      const job = app.db
        .prepare('SELECT id FROM jobs WHERE id = ? AND user_id = ?')
        .get(jobId, payload.uid);

      if (!job) {
        return reply.code(404).send({ error: '岗位不存在' });
      }

      const optimizationId = randomUUID();
      const originalWordCount = body.originalResume.length;
      const optimizedWordCount = body.optimizedResume?.length || 0;

      // 插入简历优化记录
      app.db
        .prepare(
          `INSERT INTO resume_optimizations
           (id, user_id, job_id, status, original_resume, original_word_count,
            optimized_resume, optimized_word_count, model_id, model_name, suggestion,
            optimization_count, error_message, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))`
        )
        .run(
          optimizationId,
          payload.uid,
          jobId,
          body.status,
          body.originalResume,
          originalWordCount,
          body.optimizedResume || null,
          optimizedWordCount,
          body.modelId || null,
          body.modelName || null,
          body.suggestion || null,
          body.errorMessage || null
        );

      return {
        optimizationId,
        message: '简历优化记录创建成功'
      };
    } catch (err: any) {
      app.log.error({ err }, '创建简历优化记录失败');
      if (err.name === 'ZodError') {
        return reply.code(400).send(buildPrefixedError('创建简历优化记录失败', err, 400));
      }
      return reply.code(500).send(buildPrefixedError('创建简历优化记录失败', err, 500));
    }
  });

  // 更新简历优化记录 PUT /resume-optimizations/:id
  app.put('/resume-optimizations/:id', async (req, reply) => {
    try {
      const payload = await req.jwtVerify();
      const id = (req.params as any)?.id as string;
      const body = z.object({
        optimizedResume: z.string().optional(),
        suggestion: z.string().optional(),
        status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
        errorMessage: z.string().optional(),
      }).parse(req.body);

      // 检查记录是否存在且属于当前用户
      const existing = app.db
        .prepare('SELECT id, optimization_count FROM resume_optimizations WHERE id = ? AND user_id = ?')
        .get(id, payload.uid);

      if (!existing) {
        return reply.code(404).send({ error: '简历优化记录不存在' });
      }

      const optimizedWordCount = body.optimizedResume?.length || 0;
      const newOptimizationCount = existing.optimization_count + 1;

      // 更新简历优化记录
      app.db
        .prepare(
          `UPDATE resume_optimizations
           SET optimized_resume = COALESCE(?, optimized_resume),
               optimized_word_count = ?,
               suggestion = COALESCE(?, suggestion),
               status = COALESCE(?, status),
               error_message = COALESCE(?, error_message),
               optimization_count = ?,
               updated_at = datetime('now', 'localtime')
           WHERE id = ? AND user_id = ?`
        )
        .run(
          body.optimizedResume || null,
          optimizedWordCount,
          body.suggestion || null,
          body.status || null,
          body.errorMessage || null,
          newOptimizationCount,
          id,
          payload.uid
        );

      return {
        success: true,
        message: '简历优化记录更新成功'
      };
    } catch (err: any) {
      app.log.error({ err }, '更新简历优化记录失败');
      if (err.name === 'ZodError') {
        return reply.code(400).send(buildPrefixedError('更新简历优化记录失败', err, 400));
      }
      return reply.code(500).send(buildPrefixedError('更新简历优化记录失败', err, 500));
    }
  });

  // 简历优化接口
  app.post(
    '/jobs/optimize-resume',
    withErrorLogging(app.log as any, 'jobs.optimize-resume', async (req: any, reply: any) => {
      try {
        const payload = await req.jwtVerify();
        const body = z
          .object({
            jobId: z.string(),
            resumeContent: z.string().min(1),
            jobDescription: z.string().min(1),
          })
          .parse(req.body);

        // 从用户表获取选中的模型 ID
        const user = app.db
          .prepare('SELECT selected_model_id FROM users WHERE id = ?')
          .get(payload.uid);
        if (!user || !user.selected_model_id) {
          return reply.code(400).send({ error: '用户未选择大模型，请先在设置中选择一个模型' });
        }

        // 获取模型信息
        const model = app.db
          .prepare('SELECT * FROM models WHERE id = ?')
          .get(user.selected_model_id);
        if (!model) {
          return reply.code(400).send({ error: '所选模型不存在，请重新选择模型' });
        }

        // 获取模型参数配置
        const modelParams = app.db
          .prepare('SELECT param_key, value FROM model_params WHERE model_id = ?')
          .all(user.selected_model_id);

        // 构建参数对象
        const params: Record<string, any> = {};
        modelParams.forEach((param: any) => {
          const value = param.value;
          // 尝试将字符串转换为数字（对于 temperature、max_tokens 等）
          if (!isNaN(Number(value))) {
            params[param.param_key] = Number(value);
          } else {
            params[param.param_key] = value;
          }
        });

        // 从数据库获取优化提示词模板
        const promptRow = app.db
          .prepare('SELECT content FROM prompts WHERE id = ?')
          .get('OptimizeResumePrompt');

        if (!promptRow) {
          return reply.code(500).send(buildPrefixedError('简历优化失败', new Error('优化提示词模板不存在'), 500));
        }

        // 渲染模板变量
        const renderTemplate = (tmpl: string, vars: Record<string, any>): string => {
          const varNames = Object.keys(vars);
          const varValues = Object.values(vars);
          try {
            const func = new Function(...varNames, `return \`${tmpl}\`;`);
            return func(...varValues);
          } catch (error) {
            app.log.error({ err: error }, 'Failed to render template');
            throw new Error('Failed to render prompt template');
          }
        };

        const optimizePrompt = renderTemplate(promptRow.content, {
          jobDescription: body.jobDescription,
          resumeContent: body.resumeContent,
          resumeLength: body.resumeContent.length,
        });

        // 直接调用对应的 API（与模型测试使用相同配置）
        const credentials = model.credentials ? JSON.parse(model.credentials) : {};
        const baseUrl = (credentials.base_url || credentials.baseUrl || '').replace(/\/+$/, '');
        const apiKey = credentials.api_key || credentials.apiKey;

        // 检查 baseUrl 是否已经包含 v1
        let requestUrl = '';
        if (baseUrl.endsWith('/v1')) {
          requestUrl = `${baseUrl}/chat/completions`;
        } else {
          requestUrl = `${baseUrl}/v1/chat/completions`;
        }

        const llmResponse = await fetch(requestUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model.model_name,
            messages: [
              {
                role: 'user',
                content: optimizePrompt,
              },
            ],
            // 使用用户配置的参数，如果没有配置则使用默认值
            temperature: params.temperature || 0.7,
            max_tokens: Math.max(params.max_tokens || 4000, 4000), // 确保至少 4000 个 token
            // 添加其他可能的参数
            ...(params.top_p && { top_p: params.top_p }),
            ...(params.frequency_penalty && { frequency_penalty: params.frequency_penalty }),
            ...(params.presence_penalty && { presence_penalty: params.presence_penalty }),
          }),
        });

        if (!llmResponse.ok) {
          const errorText = await llmResponse.text();
          app.log.error(`LLM service error: ${llmResponse.status} - ${errorText}`);
          return reply
            .code(500)
            .send(buildPrefixedError('简历优化失败', new Error(errorText), 500));
        }

        const llmResult = (await llmResponse.json()) as any;
        const content = llmResult.choices?.[0]?.message?.content;

        if (!content) {
          return reply
            .code(500)
            .send(buildPrefixedError('简历优化失败', new Error('大模型返回内容为空'), 500));
        }

        // 尝试解析 JSON 格式的回复
        let result;
        try {
          result = JSON.parse(content);
        } catch (e) {
          // 如果不是 JSON 格式，则简单处理
          result = {
            suggestions: '优化建议：' + content.substring(0, 500),
            optimizedResume: content,
          };
        }

        // 验证优化后简历的长度
        const originalLength = body.resumeContent.length;
        const optimizedLength = (result.optimizedResume || content).length;
        const minRequiredLength = Math.floor(originalLength * 0.8); // 至少 80%的长度

        if (optimizedLength < minRequiredLength) {
          app.log.warn(
            `Optimized resume too short: ${optimizedLength} chars (original: ${originalLength} chars, required: ${minRequiredLength} chars)`,
          );

          // 如果优化后的内容太短，返回警告信息
          return {
            success: true,
            suggestions:
              (result.suggestions || '暂无具体建议') +
              '\n\n注意：AI 生成的简历内容相对较短，建议您在优化后的基础上补充更多详细信息。',
            optimizedResume: result.optimizedResume || content,
            warning: `优化后的简历较短（${optimizedLength}字），建议在此基础上补充更多详细信息。原简历${originalLength}字。`,
          };
        }

        return {
          success: true,
          suggestions: result.suggestions || '暂无具体建议',
          optimizedResume: result.optimizedResume || content,
        };
      } catch (err: any) {
        app.log.error({ err: err }, '简历优化失败');
        if (err.name === 'ZodError') {
          return reply.code(400).send(buildPrefixedError('简历优化失败', err, 400));
        }
        return reply.code(500).send(buildPrefixedError('简历优化失败', err, 500));
      }
    }),
  );
}
