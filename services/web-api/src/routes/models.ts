import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

export function registerModelRoutes(app: FastifyInstance) {
  // 列表查询（支持按提供商/类型/关键字过滤）
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
    scope: z.enum(['public', 'private', 'local']).default('public'),
    model_name: z.string().min(1),
    version: z.string().optional(),
    base_url: z.string().optional(),
    api_url: z.string().optional(),
    api_key: z.string().optional(),
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
  });

  app.post('/models', async (req) => {
    const body = upsertSchema.parse((req as any).body || {});
    const id = body.id || crypto.randomUUID();
    const now = Date.now();
    (app as any).db
      .prepare(
        `INSERT OR REPLACE INTO models (id, name, provider, type, scope, model_name, version, base_url, api_url, api_key, created_by, is_enabled, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, COALESCE((SELECT created_at FROM models WHERE id=?), ?), ?)`,
      )
      .run(
        id,
        body.name,
        body.provider,
        body.type ?? 'llm',
        body.scope ?? 'public',
        body.model_name,
        body.version || null,
        body.base_url || null,
        body.api_url || null,
        body.api_key || null,
        'admin',
        id,
        now,
        now,
      );

    if (body.params?.length) {
      const del = (app as any).db.prepare('DELETE FROM model_params WHERE model_id=?');
      del.run(id);
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
            p.default_value != null ? String(p.default_value) : null,
            p.required ? 1 : 0,
            p.extra ? JSON.stringify(p.extra) : null,
            now,
            now,
          );
        }
      });
      tx(body.params);
    }

    return { id };
  });

  // 删除
  app.delete('/models/:id', async (req) => {
    const id = (req.params as any).id;
    (app as any).db.prepare('DELETE FROM models WHERE id=?').run(id);
    (app as any).db.prepare('DELETE FROM model_params WHERE model_id=?').run(id);
    return { success: true };
  });

  // 将模型绑定到当前用户
  app.post('/models/select', async (req, reply) => {
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
  });

  // 内部接口：根据 userId 返回其绑定模型（受服务密钥保护）
  app.get('/internal/models/by-user', async (req, reply) => {
    const query = (req as any).query || {};
    const userId = query.userId as string;
    const serviceKey = (req as any).headers['x-service-key'] as string | undefined;
    if (!process.env.SERVICE_KEY || serviceKey !== process.env.SERVICE_KEY) {
      return reply.code(401).send({ error: 'unauthorized' });
    }
    if (!userId) return reply.code(400).send({ error: 'userId required' });
    const u = (app as any).db.prepare('SELECT selected_model_id FROM users WHERE id=?').get(userId);
    if (!u?.selected_model_id) return { model: null };
    const model = (app as any).db
      .prepare('SELECT * FROM models WHERE id=?')
      .get(u.selected_model_id);
    if (!model) return { model: null };
    const params = (app as any).db
      .prepare('SELECT * FROM model_params WHERE model_id=?')
      .all(model.id);
    return { model, params };
  });
}
