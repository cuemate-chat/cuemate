import { withErrorLogging } from '@cuemate/logger';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

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
        const modelRow = (app as any).db.prepare('SELECT * FROM models WHERE id=?').get(id);
        const creds = modelRow?.credentials ? JSON.parse(modelRow.credentials) : {};
        const base = process.env.LLM_ROUTER_BASE || 'http://llm-router:3002';
        const res = await fetch(`${base}/providers/probe`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: modelRow.provider,
            provider: modelRow.provider,
            base_url: creds.base_url || creds.baseUrl,
            api_key: creds.api_key || creds.apiKey,
            model_name: modelRow.model_name,
            temperature: creds.temperature,
            max_tokens: creds.max_tokens,
            params: creds,
            mode: 'both',
            embed_base_url: creds.embed_base_url || creds.embedBaseUrl,
            embed_api_key: creds.embed_api_key || creds.embedApiKey,
            embed_model: creds.embed_model || creds.embedModel,
          }),
        });
        const data = (await res.json()) as any;
        const ok = !!data?.ok;
        (app as any).db
          .prepare('UPDATE models SET status=? WHERE id=?')
          .run(ok ? 'ok' : 'fail', id);
      } catch {}

      return { id };
    }),
  );

  // 删除
  app.delete('/models/:id', async (req) => {
    const id = (req.params as any).id;
    (app as any).db.prepare('DELETE FROM models WHERE id=?').run(id);
    (app as any).db.prepare('DELETE FROM model_params WHERE model_id=?').run(id);
    return { success: true };
  });

  // 测试连通性（简单调用 llm-router 的 /providers/health-check 或根据凭证直连）
  app.post(
    '/models/:id/test',
    withErrorLogging(app.log as any, 'models.test', async (req, reply) => {
      const id = (req.params as any).id;
      const model = (app as any).db.prepare('SELECT * FROM models WHERE id=?').get(id);
      if (!model) return reply.code(404).send({ error: '模型不存在' });
      const creds = model.credentials ? JSON.parse(model.credentials) : {};

      // 从 model_params 表读取所有运行参数
      const params = (app as any).db.prepare('SELECT * FROM model_params WHERE model_id=?').all(id);
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
            // 其他参数保持原值
            paramsMap[p.param_key] = p.value;
          }
        }
      }

      // 调用 llm-router 的动态探测接口
      const base = process.env.LLM_ROUTER_BASE || 'http://llm-router:3002';

      // 构建请求体
      const requestBody = {
        id: model.provider,
        provider: model.provider,
        // 动态传递所有凭证字段（过滤掉 undefined 和 null）
        ...Object.fromEntries(
          Object.entries(creds).filter(([_, value]) => value !== undefined && value !== null),
        ),
        model_name: model.model_name,
        // 传递所有运行参数
        ...paramsMap,
        // 传递完整的参数映射，供 provider 使用
        allParams: paramsMap,
        mode: 'both',
      };

      // 调试日志
      console.log('Testing model connectivity:', {
        modelId: id,
        provider: model.provider,
        modelName: model.model_name,
        credentials: creds,
        params: paramsMap,
        requestBody,
        llmRouterBase: base,
      });

      try {
        console.log('Calling llm-router probe endpoint...');
        const res = await fetch(`${base}/providers/probe`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        console.log('llm-router response status:', res.status);
        console.log('llm-router response headers:', Object.fromEntries(res.headers.entries()));

        if (!res.ok) {
          const errorText = await res.text();
          console.error('llm-router error response:', errorText);
          throw new Error(`llm-router responded with status ${res.status}: ${errorText}`);
        }

        const data = (await res.json()) as any;
        console.log('llm-router response data:', data);

        const ok = !!data?.ok;
        (app as any).db
          .prepare('UPDATE models SET status=? WHERE id=?')
          .run(ok ? 'ok' : 'fail', id);
        return { ok, chatOk: data?.chatOk, embedOk: data?.embedOk };
      } catch (e) {
        console.error('Error calling llm-router:', e);
        (app as any).db.prepare('UPDATE models SET status=? WHERE id=?').run('fail', id);
        return { ok: false, error: (e as any)?.message || 'probe failed' };
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
      } catch {
        return reply.code(401).send({ error: '未认证' });
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
      if (!process.env.SERVICE_KEY || serviceKey !== process.env.SERVICE_KEY) {
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
