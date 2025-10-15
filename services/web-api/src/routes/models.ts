import { withErrorLogging } from '@cuemate/logger';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getLlmRouterUrl, SERVICE_CONFIG } from '../config/services.js';
import { buildPrefixedError } from '../utils/error-response.js';
import { OperationType } from '../utils/operation-logger.js';
import { logOperation, OPERATION_MAPPING } from '../utils/operation-logger-helper.js';
import { notifyModelAdded } from '../utils/notification-helper.js';

export function registerModelRoutes(app: FastifyInstance) {
  // 列表查询（支持按供应商/类型/关键字过滤）
  app.get('/models', async (req) => {
    const q: any = (req as any).query || {};
    const { provider, type, scope, keyword } = q;
    let sql = 'SELECT * FROM models WHERE 1=1';
    const args: any[] = [];
    if (provider) {
      sql += ' AND provider=?';
      args.push(provider);
    }
    if (type) {
      sql += ' AND type=?';
      args.push(type);
    }
    if (scope) {
      sql += ' AND scope=?';
      args.push(scope);
    }
    if (keyword) {
      sql += ' AND (name LIKE ? OR model_name LIKE ?)';
      args.push(`%${keyword}%`, `%${keyword}%`);
    }
    sql += ' ORDER BY created_at DESC';
    const list = (app as any).db.prepare(sql).all(...args);
    return { list };
  });

  // 读取单个模型及其参数
  app.get('/models/:id', async (req, reply) => {
    const id = (req.params as any).id;
    const model = (app as any).db.prepare('SELECT * FROM models WHERE id=?').get(id);
    if (!model) return reply.code(404).send({ error: '模型不存在' });
    const params = (app as any).db
      .prepare('SELECT * FROM model_params WHERE model_id=? ORDER BY created_at ASC')
      .all(id);
    return { model, params };
  });

  // 新增/更新模型
  const upsertSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    provider: z.string().min(1),
    type: z.string().default('llm'),
    scope: z.enum(['public', 'private']).default('public'),
    model_name: z.string().min(1),
    icon: z.string().optional(),
    version: z.string().optional(),
    credentials: z.any().optional(),
    params: z
      .array(
        z.object({
          id: z.string().optional(),
          label: z.string().optional(),
          param_key: z.string(),
          ui_type: z.string().optional(),
          value: z.any().optional(),
          default_value: z.any().optional(),
          required: z.boolean().optional(),
          extra: z.any().optional(),
        }),
      )
      .optional(),
    status: z.string().optional(),
  });

  app.post(
    '/models',
    withErrorLogging(app.log as any, 'models.upsert', async (req) => {
      const body = upsertSchema.parse((req as any).body || {});
      const id = body.id || crypto.randomUUID();
      const now = Date.now();
      (app as any).db
        .prepare(
          `INSERT OR REPLACE INTO models (id, name, provider, type, scope, model_name, icon, version, credentials, status, created_by, is_enabled, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, COALESCE((SELECT created_at FROM models WHERE id=?), ?), ?)`,
        )
        .run(
          id,
          body.name,
          body.provider,
          body.type ?? 'llm',
          body.scope ?? 'public',
          body.model_name,
          body.icon || null,
          body.version || body.model_name || null,
          body.credentials ? JSON.stringify(body.credentials) : null,
          body.status || null,
          'admin',
          id,
          now,
          now,
        );

      // 统一做法：先删后插，避免旧参数残留或丢失
      const del = (app as any).db.prepare('DELETE FROM model_params WHERE model_id=?');
      del.run(id);
      if (body.params?.length) {
        const insert = (app as any).db.prepare(
          `INSERT INTO model_params (id, model_id, label, param_key, ui_type, value, default_value, required, extra, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        );
        const tx = (app as any).db.transaction((items: any[]) => {
          for (const p of items) {
            insert.run(
              crypto.randomUUID(),
              id,
              p.label || null,
              p.param_key,
              p.ui_type || 'slider',
              p.value != null ? String(p.value) : null,
              p.default_value != null ? String(p.value) : null,
              p.required ? 1 : 0,
              p.extra ? JSON.stringify(p.extra) : null,
              now,
              now,
            );
          }
        });
        tx(body.params);
      }

      // 保存后自动进行连通测试并更新状态
      try {
        await testModelConnectivityInternal(app, id);
      } catch (error) {
        // 测试失败不影响保存，只记录错误
        app.log.error({ modelId: id, error: error instanceof Error ? error.message : String(error) }, 'Model connectivity test failed after save');
      }

      // 记录模型操作
      const isUpdate = body.id && (app as any).db.prepare('SELECT 1 FROM models WHERE id=? AND created_at < ?').get(id, now);
      const operation = isUpdate ? OperationType.UPDATE : OperationType.CREATE;
      const message = isUpdate ? `更新模型: ${body.name}` : `创建模型: ${body.name}`;

      await logOperation(app, req, {
        ...OPERATION_MAPPING.MODEL,
        resourceId: id,
        resourceName: body.name,
        operation,
        message,
        status: 'success'
      });

      // 发送模型添加通知 (仅针对新增模型)
      if (!isUpdate) {
        try {
          // 获取用户ID (如果是管理员操作,通知所有用户或特定用户)
          // 这里简化处理,通知系统管理员(假设uid为admin或第一个用户)
          const adminUser = (app as any).db
            .prepare('SELECT id FROM users ORDER BY created_at ASC LIMIT 1')
            .get();

          if (adminUser) {
            notifyModelAdded(
              (app as any).db,
              adminUser.id,
              id,
              body.name,
              body.provider,
              body.type
            );
          }
        } catch (notifyError) {
          app.log.error({ err: notifyError }, '发送模型添加通知失败');
        }
      }

      return { id };
    }),
  );

  // 删除
  app.delete('/models/:id', async (req) => {
    const id = (req.params as any).id;
    
    // 获取模型信息用于记录
    const modelRow = (app as any).db.prepare('SELECT name FROM models WHERE id=?').get(id);
    
    (app as any).db.prepare('DELETE FROM models WHERE id=?').run(id);
    (app as any).db.prepare('DELETE FROM model_params WHERE model_id=?').run(id);
    
    // 记录删除操作
    await logOperation(app, req, {
      ...OPERATION_MAPPING.MODEL,
      resourceId: id,
      resourceName: modelRow?.name || '未知模型',
      operation: OperationType.DELETE,
      message: `删除模型: ${modelRow?.name || id}`,
      status: 'success'
    });
    
    return { success: true };
  });

  // 测试连通性（简单调用 llm-router 的 /providers/health-check 或根据凭证直连）
  app.post(
    '/models/:id/test',
    withErrorLogging(app.log as any, 'models.test', async (req) => {
      const id = (req.params as any).id;
      try {
        const result = await testModelConnectivityInternal(app, id);
        return result;
      } catch (error) {
        const message = (error as Error).message || 'probe failed';
        return { ok: false, error: message };
      }
    }),
  );

  // 将模型绑定到当前用户
  app.post(
    '/models/select',
    withErrorLogging(app.log as any, 'models.select', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const schema = z.object({ model_id: z.string() });
        const { model_id } = schema.parse((req as any).body || {});
        const exists = (app as any).db.prepare('SELECT id FROM models WHERE id=?').get(model_id);
        if (!exists) return reply.code(404).send({ error: '模型不存在' });
        (app as any).db
          .prepare('UPDATE users SET selected_model_id=? WHERE id=?')
          .run(model_id, payload.uid);
        return { success: true };
      } catch (err) {
        return reply.code(401).send(buildPrefixedError('选择模型失败', err, 401));
      }
    }),
  );

  // 内部接口：根据 userId 返回其绑定模型（受服务密钥保护）
  app.get(
    '/internal/models/by-user',
    withErrorLogging(app.log as any, 'models.by-user', async (req, reply) => {
      const query = (req as any).query || {};
      const userId = query.userId as string;
      const serviceKey = (req as any).headers['x-service-key'] as string | undefined;
      const INTERNAL_SERVICE_KEY = 'internal-service-key-2025';
      if (serviceKey !== INTERNAL_SERVICE_KEY) {
        return reply.code(401).send({ error: 'unauthorized' });
      }
      if (!userId) return reply.code(400).send({ error: 'userId required' });
      const u = (app as any).db
        .prepare('SELECT selected_model_id FROM users WHERE id=?')
        .get(userId);
      if (!u?.selected_model_id) return { model: null };
      const model = (app as any).db
        .prepare('SELECT * FROM models WHERE id=?')
        .get(u.selected_model_id);
      if (!model) return { model: null };
      const params = (app as any).db
        .prepare('SELECT * FROM model_params WHERE model_id=?')
        .all(model.id);
      return { model, params };
    }),
  );
}

// 内部测试模型连接性函数，复用现有测试逻辑
async function testModelConnectivityInternal(app: FastifyInstance, modelId: string) {
  const model = (app as any).db.prepare('SELECT * FROM models WHERE id=?').get(modelId);
  if (!model) {
    throw new Error('模型不存在');
  }
  
  const creds = model.credentials ? JSON.parse(model.credentials) : {};

  // 从 model_params 表读取所有运行参数
  const params = (app as any).db.prepare('SELECT * FROM model_params WHERE model_id=?').all(modelId);
  const paramsMap: Record<string, any> = {};
  for (const p of params) {
    if (p.value) {
      // 根据参数类型转换值
      if (p.param_key === 'temperature') {
        paramsMap[p.param_key] = parseFloat(p.value);
      } else if (
        p.param_key === 'max_tokens' ||
        p.param_key === 'maxTokens' ||
        p.param_key === 'num_predict'
      ) {
        paramsMap[p.param_key] = parseInt(p.value);
      } else if (p.param_key === 'stream') {
        paramsMap[p.param_key] = p.value === 'true';
      } else {
        paramsMap[p.param_key] = p.value;
      }
    }
  }

  // 构建请求体 - 按照llm-router期望的格式
  const requestBody = {
    provider: model.provider,
    model_name: model.model_name,
    mode: 'both',
    // 直接传递所有凭证字段，llm-router会自动处理字段名映射
    ...Object.fromEntries(
      Object.entries(creds).filter(([_, value]) => value !== undefined && value !== null),
    ),
    // 传递完整的参数映射，供 provider 使用
    allParams: paramsMap,
  };

  // 调试日志：打印发送的请求体
  app.log.info({ 
    modelId,
    provider: model.provider, 
    model_name: model.model_name,
    credentials: creds,
    requestBody 
  }, '发送给llm-router的请求体');

  const res = await fetch(getLlmRouterUrl(SERVICE_CONFIG.LLM_ROUTER.ENDPOINTS.PROBE), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const text = await res.text();
    app.log.error({ status: res.status, body: text }, 'llm-router probe failed');
    (app as any).db.prepare('UPDATE models SET status=? WHERE id=?').run('fail', modelId);
    throw new Error(`测试失败: ${res.status} ${text}`);
  }

  const data = (await res.json()) as any;
  const ok = !!data?.ok;
  
  // 更新模型状态
  (app as any).db.prepare('UPDATE models SET status=? WHERE id=?').run(ok ? 'ok' : 'fail', modelId);
  
  if (!ok) {
    const errorMsg = data?.error || data?.chatError || data?.embedError || 'Unknown error';
    throw new Error(`连接测试失败: ${errorMsg}`);
  }
  
  return { ok, chatOk: data?.chatOk, embedOk: data?.embedOk };
}
