import { withErrorLogging } from '@cuemate/logger';
import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

export function registerAuthRoutes(app: FastifyInstance) {
  // 允许用用户名（name / id）或邮箱登录：字段统一为 account
  const signinSchema = z.object({ account: z.string().min(1), password: z.string().min(6) });
  app.post('/auth/signin', async (req, reply) => {
    const body = signinSchema.parse(req.body);
    let row: any = null;
    if (body.account.includes('@')) {
      row = app.db.prepare('SELECT * FROM users WHERE email=?').get(body.account);
    } else {
      row = app.db
        .prepare('SELECT * FROM users WHERE id=? OR name=?')
        .get(body.account, body.account);
    }
    if (!row) return reply.code(401).send({ error: '账号或密码错误' });
    const ok = await bcrypt.compare(body.password, row.password_hash);
    if (!ok) return reply.code(401).send({ error: '账号或密码错误' });
    const token = app.jwt.sign({ uid: row.id, email: row.email });
    const user = {
      id: row.id,
      email: row.email,
      name: row.name,
      created_at: row.created_at,
      theme: row.theme ?? 'system',
      locale: row.locale ?? 'zh-CN',
      timezone: row.timezone ?? 'Asia/Shanghai',
    };
    return { token, user };
  });

  // 获取当前登录用户信息
  app.get(
    '/auth/me',
    withErrorLogging(app.log as any, 'auth.me', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const row = (app as any).db
          .prepare(
            'SELECT id, email, name, created_at, theme, locale, timezone, selected_model_id FROM users WHERE id = ?',
          )
          .get(payload.uid);
        if (!row) return reply.code(404).send({ error: '用户不存在' });
        return { user: row };
      } catch (err) {
        return reply.code(401).send({ error: '未认证' });
      }
    }),
  );

  // 更新当前用户信息（name、email、theme、locale、timezone）
  app.post(
    '/auth/update-setting',
    withErrorLogging(app.log as any, 'auth.update-setting', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const body: any = req.body || {};
        const fields: string[] = [];
        const args: any[] = [];
        if (typeof body.name === 'string') {
          fields.push('name=?');
          args.push(body.name);
        }
        if (typeof body.email === 'string') {
          fields.push('email=?');
          args.push(body.email);
        }
        if (typeof body.theme === 'string') {
          fields.push('theme=?');
          args.push(body.theme);
        }
        if (typeof body.locale === 'string') {
          fields.push('locale=?');
          args.push(body.locale);
        }
        if (typeof body.timezone === 'string') {
          fields.push('timezone=?');
          args.push(body.timezone);
        }

        if (typeof body.selected_model_id === 'string') {
          fields.push('selected_model_id=?');
          args.push(body.selected_model_id);
        }
        if (fields.length === 0) return { success: true };
        args.push(payload.uid);
        (app as any).db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...args);
        const row = (app as any).db
          .prepare(
            'SELECT id, email, name, created_at, theme, locale, timezone, selected_model_id FROM users WHERE id = ?',
          )
          .get(payload.uid);
        return { success: true, user: row };
      } catch (err) {
        return reply.code(401).send({ error: '未认证' });
      }
    }),
  );

  // 独立修改密码
  app.post(
    '/auth/change-password',
    withErrorLogging(app.log as any, 'auth.change-password', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();
        const schema = z.object({ oldPassword: z.string().min(6), newPassword: z.string().min(6) });
        const body = schema.parse(req.body);
        const row = (app as any).db
          .prepare('SELECT password_hash FROM users WHERE id = ?')
          .get(payload.uid);
        if (!row) return reply.code(404).send({ error: '用户不存在' });
        const ok = await bcrypt.compare(body.oldPassword, row.password_hash);
        if (!ok) return reply.code(400).send({ error: '原密码不正确' });
        const newHash = await bcrypt.hash(body.newPassword, 10);
        (app as any).db
          .prepare('UPDATE users SET password_hash=? WHERE id=?')
          .run(newHash, payload.uid);
        return { success: true };
      } catch (err) {
        return reply.code(401).send({ error: '未认证' });
      }
    }),
  );
}
