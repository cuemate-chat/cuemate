import { withErrorLogging } from '@cuemate/logger';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { buildPrefixedError } from '../utils/error-response.js';
import { logOperation, OPERATION_MAPPING } from '../utils/operation-logger-helper.js';

// 请求体验证模式
const createConversationSchema = z.object({
  title: z.string().min(1).max(255),
  model_provider: z.string().min(1).max(50),
  model_name: z.string().min(1).max(100),
  model_config: z.object({}).passthrough().optional(),
});

const createMessageSchema = z.object({
  conversation_id: z.number().int().positive(),
  message_type: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
  content_format: z.enum(['text', 'markdown', 'json']).optional().default('text'),
  sequence_number: z.number().int().positive(),
  token_count: z.number().int().min(0).optional().default(0),
  response_time_ms: z.number().int().min(0).optional(),
  error_message: z.string().optional(),
  metadata: z.object({}).passthrough().optional(),
});

const updateConversationSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  status: z.enum(['active', 'completed', 'error']).optional(),
  token_used: z.number().int().min(0).optional(),
});

export function registerAIConversationRoutes(app: FastifyInstance) {
  // 获取用户的AI对话列表
  app.get(
    '/ai/conversations',
    withErrorLogging(app.log as any, 'ai-conversations.list', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const { page = 1, limit = 20, status = 'all' } = req.query as any;

        let whereClause = 'WHERE user_id = ?';
        let params = [payload.uid];

        if (status !== 'all') {
          whereClause += ' AND status = ?';
          params.push(status);
        }

        // 获取总数
        const totalRow = (app as any).db
          .prepare(`SELECT COUNT(1) as cnt FROM ai_conversations ${whereClause}`)
          .get(...params);
        const total = totalRow?.cnt ?? 0;

        // 获取对话列表
        const offset = (page - 1) * limit;
        const rows = (app as any).db
          .prepare(`
            SELECT id, title, model_provider, model_name, message_count, 
                   token_used, status, created_at, updated_at
            FROM ai_conversations 
            ${whereClause}
            ORDER BY updated_at DESC 
            LIMIT ? OFFSET ?
          `)
          .all(...params, limit, offset);

        await logOperation(app, req, {
          ...OPERATION_MAPPING.AI_CONVERSATION,
          operation: 'view',
          resourceId: undefined,
          resourceName: undefined,
          message: `获取AI对话列表，共${total}条记录`,
          userId: payload.uid,
          userName: payload.username,
        });

        return { items: rows, total };
      } catch (err) {
        return reply.code(401).send(buildPrefixedError('获取AI对话列表失败', err, 401));
      }
    }),
  );

  // 获取单个对话详情（包含所有消息）
  app.get(
    '/ai/conversations/:id',
    withErrorLogging(app.log as any, 'ai-conversations.detail', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const { id } = req.params as any;

        // 获取对话基本信息
        const conversation = (app as any).db
          .prepare(`
            SELECT * FROM ai_conversations 
            WHERE id = ? AND user_id = ?
          `)
          .get(id, payload.uid);

        if (!conversation) {
          return reply.code(404).send(buildPrefixedError('对话不存在', null, 404));
        }

        // 获取对话消息
        const messages = (app as any).db
          .prepare(`
            SELECT * FROM ai_messages 
            WHERE conversation_id = ? 
            ORDER BY sequence_number ASC
          `)
          .all(id);

        // 解析JSON字段
        if (conversation.model_config) {
          try {
            conversation.model_config = JSON.parse(conversation.model_config);
          } catch (e) {
            conversation.model_config = {};
          }
        }

        messages.forEach((msg: any) => {
          if (msg.metadata) {
            try {
              msg.metadata = JSON.parse(msg.metadata);
            } catch (e) {
              msg.metadata = {};
            }
          }
        });

        await logOperation(app, req, {
          ...OPERATION_MAPPING.AI_CONVERSATION,
          operation: 'view',
          resourceId: id,
          resourceName: conversation.title,
          message: `查看对话详情`,
          userId: payload.uid,
          userName: payload.username,
        });

        return { conversation, messages };
      } catch (err) {
        return reply.code(401).send(buildPrefixedError('获取对话详情失败', err, 401));
      }
    }),
  );

  // 创建新的AI对话会话
  app.post(
    '/ai/conversations',
    withErrorLogging(app.log as any, 'ai-conversations.create', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const validatedData = createConversationSchema.parse(req.body);

        const result = (app as any).db
          .prepare(`
            INSERT INTO ai_conversations (
              title, user_id, model_provider, model_name, model_config
            ) VALUES (?, ?, ?, ?, ?)
          `)
          .run(
            validatedData.title,
            payload.uid,
            validatedData.model_provider,
            validatedData.model_name,
            validatedData.model_config ? JSON.stringify(validatedData.model_config) : null,
          );

        await logOperation(app, req, {
          ...OPERATION_MAPPING.AI_CONVERSATION,
          operation: 'create',
          resourceId: result.lastInsertRowid.toString(),
          resourceName: validatedData.title,
          message: `创建AI对话会话`,
          userId: payload.uid,
          userName: payload.username,
        });

        return { id: result.lastInsertRowid, message: 'AI对话会话创建成功' };
      } catch (err) {
        if (err instanceof z.ZodError) {
          return reply.code(400).send(buildPrefixedError('请求参数错误', err.errors, 400));
        }
        return reply.code(500).send(buildPrefixedError('创建AI对话会话失败', err, 500));
      }
    }),
  );

  // 更新对话会话信息
  app.put(
    '/ai/conversations/:id',
    withErrorLogging(app.log as any, 'ai-conversations.update', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const { id } = req.params as any;
        const validatedData = updateConversationSchema.parse(req.body);

        // 检查对话是否存在且属于当前用户
        const conversation = (app as any).db
          .prepare('SELECT * FROM ai_conversations WHERE id = ? AND user_id = ?')
          .get(id, payload.uid);

        if (!conversation) {
          return reply.code(404).send(buildPrefixedError('对话不存在', null, 404));
        }

        const updates = [];
        const values = [];
        
        if (validatedData.title) {
          updates.push('title = ?');
          values.push(validatedData.title);
        }
        
        if (validatedData.status) {
          updates.push('status = ?');
          values.push(validatedData.status);
        }
        
        if (validatedData.token_used !== undefined) {
          updates.push('token_used = ?');
          values.push(validatedData.token_used);
        }

        if (updates.length > 0) {
          values.push(id);
          (app as any).db
            .prepare(`UPDATE ai_conversations SET ${updates.join(', ')} WHERE id = ?`)
            .run(...values);
        }

        await logOperation(app, req, {
          ...OPERATION_MAPPING.AI_CONVERSATION,
          operation: 'update',
          resourceId: id,
          resourceName: validatedData.title || conversation.title,
          message: `更新对话信息`,
          userId: payload.uid,
          userName: payload.username,
        });

        return { message: '对话信息更新成功' };
      } catch (err) {
        if (err instanceof z.ZodError) {
          return reply.code(400).send(buildPrefixedError('请求参数错误', err.errors, 400));
        }
        return reply.code(500).send(buildPrefixedError('更新对话信息失败', err, 500));
      }
    }),
  );

  // 删除对话会话（级联删除所有消息）
  app.delete(
    '/ai/conversations/:id',
    withErrorLogging(app.log as any, 'ai-conversations.delete', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const { id } = req.params as any;

        // 检查对话是否存在且属于当前用户
        const conversation = (app as any).db
          .prepare('SELECT * FROM ai_conversations WHERE id = ? AND user_id = ?')
          .get(id, payload.uid);

        if (!conversation) {
          return reply.code(404).send(buildPrefixedError('对话不存在', null, 404));
        }

        // 删除对话（外键约束会自动删除相关消息）
        (app as any).db
          .prepare('DELETE FROM ai_conversations WHERE id = ?')
          .run(id);

        await logOperation(app, req, {
          ...OPERATION_MAPPING.AI_CONVERSATION,
          operation: 'delete',
          resourceId: id,
          resourceName: conversation.title,
          message: `删除对话会话`,
          userId: payload.uid,
          userName: payload.username,
        });

        return { message: '对话删除成功' };
      } catch (err) {
        return reply.code(500).send(buildPrefixedError('删除对话失败', err, 500));
      }
    }),
  );

  // 在对话中添加新消息
  app.post(
    '/ai/messages',
    withErrorLogging(app.log as any, 'ai-messages.create', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const validatedData = createMessageSchema.parse(req.body);

        // 检查对话是否存在且属于当前用户
        const conversation = (app as any).db
          .prepare('SELECT * FROM ai_conversations WHERE id = ? AND user_id = ?')
          .get(validatedData.conversation_id, payload.uid);

        if (!conversation) {
          return reply.code(404).send(buildPrefixedError('对话不存在', null, 404));
        }

        const result = (app as any).db
          .prepare(`
            INSERT INTO ai_messages (
              conversation_id, message_type, content, content_format,
              sequence_number, token_count, response_time_ms, 
              error_message, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .run(
            validatedData.conversation_id,
            validatedData.message_type,
            validatedData.content,
            validatedData.content_format,
            validatedData.sequence_number,
            validatedData.token_count,
            validatedData.response_time_ms || null,
            validatedData.error_message || null,
            validatedData.metadata ? JSON.stringify(validatedData.metadata) : null,
          );

        await logOperation(app, req, {
          ...OPERATION_MAPPING.AI_CONVERSATION,
          operation: 'create',
          resourceId: result.lastInsertRowid.toString(),
          resourceName: `${validatedData.message_type}消息`,
          message: `在对话中添加新消息`,
          userId: payload.uid,
          userName: payload.username,
        });

        return { id: result.lastInsertRowid, message: '消息添加成功' };
      } catch (err) {
        if (err instanceof z.ZodError) {
          return reply.code(400).send(buildPrefixedError('请求参数错误', err.errors, 400));
        }
        return reply.code(500).send(buildPrefixedError('添加消息失败', err, 500));
      }
    }),
  );

  // 批量添加消息（用于保存完整对话）
  app.post(
    '/ai/conversations/:id/messages/batch',
    withErrorLogging(app.log as any, 'ai-messages.batch-create', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const { id } = req.params as any;
        const { messages } = req.body as any;

        if (!Array.isArray(messages) || messages.length === 0) {
          return reply.code(400).send(buildPrefixedError('消息数据无效', null, 400));
        }

        // 检查对话是否存在且属于当前用户
        const conversation = (app as any).db
          .prepare('SELECT * FROM ai_conversations WHERE id = ? AND user_id = ?')
          .get(id, payload.uid);

        if (!conversation) {
          return reply.code(404).send(buildPrefixedError('对话不存在', null, 404));
        }

        // 使用事务批量插入消息
        const insertMessage = (app as any).db.prepare(`
          INSERT INTO ai_messages (
            conversation_id, message_type, content, content_format,
            sequence_number, token_count, response_time_ms, 
            error_message, metadata
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const transaction = (app as any).db.transaction((msgs: any[]) => {
          for (const msg of msgs) {
            const validatedMsg = createMessageSchema.parse({
              ...msg,
              conversation_id: parseInt(id),
            });

            insertMessage.run(
              validatedMsg.conversation_id,
              validatedMsg.message_type,
              validatedMsg.content,
              validatedMsg.content_format,
              validatedMsg.sequence_number,
              validatedMsg.token_count,
              validatedMsg.response_time_ms || null,
              validatedMsg.error_message || null,
              validatedMsg.metadata ? JSON.stringify(validatedMsg.metadata) : null,
            );
          }
        });

        transaction(messages);

        await logOperation(app, req, {
          ...OPERATION_MAPPING.AI_CONVERSATION,
          operation: 'create',
          resourceId: id,
          resourceName: conversation.title,
          message: `批量添加${messages.length}条消息`,
          userId: payload.uid,
          userName: payload.username,
        });

        return { message: `成功添加${messages.length}条消息` };
      } catch (err) {
        if (err instanceof z.ZodError) {
          return reply.code(400).send(buildPrefixedError('请求参数错误', err.errors, 400));
        }
        return reply.code(500).send(buildPrefixedError('批量添加消息失败', err, 500));
      }
    }),
  );
}