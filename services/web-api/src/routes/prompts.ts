import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { buildPrefixedError } from '../utils/error-response.js';
import { logOperation, OPERATION_MAPPING } from '../utils/operation-logger-helper.js';
import { OperationType } from '../utils/operation-logger.js';

export function registerPromptRoutes(app: FastifyInstance) {
  // 获取所有 prompts 列表
  app.get('/prompts', async (req) => {
    const q: any = (req as any).query || {};
    const { source } = q;

    let sql = 'SELECT id, description, source, variables, updated_at FROM prompts WHERE 1=1';
    const args: any[] = [];

    if (source) {
      sql += ' AND source=?';
      args.push(source);
    }

    sql += ' ORDER BY id ASC';
    const list = (app as any).db.prepare(sql).all(...args);
    return { list };
  });

  // 获取单个 prompt 详情
  app.get('/prompts/:id', async (req, reply) => {
    const { id } = req.params as any;
    const prompt = (app as any).db
      .prepare('SELECT * FROM prompts WHERE id=?')
      .get(id);

    if (!prompt) {
      return reply.code(404).send({ error: 'Prompt 不存在' });
    }

    return { prompt };
  });

  // 新增 prompt
  const createSchema = z.object({
    id: z.string().min(1, 'ID不能为空'),
    content: z.string().min(1, '内容不能为空'),
    description: z.string().optional(),
    variables: z.string().optional(),
    source: z.enum(['desktop', 'web']),
    extra: z.string().optional(),
  });

  app.post('/prompts', async (req, reply) => {
    try {
      const validation = createSchema.safeParse(req.body);
      if (!validation.success) {
        return reply.code(400).send({
          error: '参数验证失败',
          details: validation.error.errors
        });
      }

      const { id, content, description, variables, source, extra } = validation.data;

      // 检查 ID 是否已存在
      const existing = (app as any).db
        .prepare('SELECT id FROM prompts WHERE id=?')
        .get(id);

      if (existing) {
        return reply.code(409).send({ error: 'Prompt ID 已存在' });
      }

      const now = Date.now();
      (app as any).db
        .prepare(`
          INSERT INTO prompts (id, content, description, variables, source, default_content, extra, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(id, content, description || null, variables || null, source, content, extra || null, now, now);

      await logOperation(app, req, {
        ...OPERATION_MAPPING.PROMPT,
        resourceId: id,
        resourceName: id,
        operation: OperationType.CREATE,
        message: `创建 Prompt: ${id}`,
        status: 'success',
      });

      return { success: true, message: 'Prompt 创建成功', id };
    } catch (err) {
      return reply.code(400).send(buildPrefixedError('创建 Prompt 失败', err, 400));
    }
  });

  // 更新 prompt 内容
  const updateSchema = z.object({
    content: z.string().min(1, '内容不能为空'),
    extra: z.string().optional(),
  });

  app.put('/prompts/:id', async (req, reply) => {
    try {
      const { id } = req.params as any;

      // 验证参数
      const validation = updateSchema.safeParse(req.body);
      if (!validation.success) {
        return reply.code(400).send({
          error: '参数验证失败',
          details: validation.error.errors
        });
      }

      const { content, extra } = validation.data;

      // 检查 prompt 是否存在
      const existing = (app as any).db
        .prepare('SELECT id, content FROM prompts WHERE id=?')
        .get(id);

      if (!existing) {
        return reply.code(404).send({ error: 'Prompt 不存在' });
      }

      // 保存当前内容到 history_pre，更新 content 和 extra
      const now = Date.now();
      (app as any).db
        .prepare(`
          UPDATE prompts
          SET content = ?,
              extra = ?,
              history_pre = ?,
              updated_at = ?
          WHERE id = ?
        `)
        .run(content, extra !== undefined ? extra : null, existing.content, now, id);

      await logOperation(app, req, {
        ...OPERATION_MAPPING.PROMPT,
        resourceId: id,
        resourceName: id,
        operation: OperationType.UPDATE,
        message: `更新 Prompt: ${id}`,
        status: 'success',
      });

      return { success: true, message: 'Prompt 更新成功' };
    } catch (err) {
      return reply.code(400).send(buildPrefixedError('更新 Prompt 失败', err, 400));
    }
  });

  // 删除 prompt
  app.delete('/prompts/:id', async (req, reply) => {
    try {
      const { id } = req.params as any;

      // 检查 prompt 是否存在
      const existing = (app as any).db
        .prepare('SELECT id FROM prompts WHERE id=?')
        .get(id);

      if (!existing) {
        return reply.code(404).send({ error: 'Prompt 不存在' });
      }

      (app as any).db
        .prepare('DELETE FROM prompts WHERE id=?')
        .run(id);

      await logOperation(app, req, {
        ...OPERATION_MAPPING.PROMPT,
        resourceId: id,
        resourceName: id,
        operation: OperationType.DELETE,
        message: `删除 Prompt: ${id}`,
        status: 'success',
      });

      return { success: true, message: 'Prompt 删除成功' };
    } catch (err) {
      return reply.code(400).send(buildPrefixedError('删除 Prompt 失败', err, 400));
    }
  });

  // 恢复 prompt 到默认值
  app.post('/prompts/:id/reset', async (req, reply) => {
    try {
      const { id } = req.params as any;

      // 检查 prompt 是否存在
      const existing = (app as any).db
        .prepare('SELECT id, content, default_content FROM prompts WHERE id=?')
        .get(id);

      if (!existing) {
        return reply.code(404).send({ error: 'Prompt 不存在' });
      }

      // 保存当前内容到 history_pre，恢复 default_content 到 content
      const now = Date.now();
      (app as any).db
        .prepare(`
          UPDATE prompts
          SET content = default_content,
              history_pre = ?,
              updated_at = ?
          WHERE id = ?
        `)
        .run(existing.content, now, id);

      await logOperation(app, req, {
        ...OPERATION_MAPPING.PROMPT,
        resourceId: id,
        resourceName: id,
        operation: OperationType.UPDATE,
        message: `恢复 Prompt 为默认值: ${id}`,
        status: 'success',
      });

      return { success: true, message: 'Prompt 已恢复为默认值' };
    } catch (err) {
      return reply.code(400).send(buildPrefixedError('恢复 Prompt 失败', err, 400));
    }
  });
}
