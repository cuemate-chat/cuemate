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
    return { token };
  });
}
