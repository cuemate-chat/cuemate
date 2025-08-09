import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

export function registerAuthRoutes(app: FastifyInstance) {
  const signupSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(1).optional(),
  });

  app.post('/auth/signup', async (req, reply) => {
    const body = signupSchema.parse(req.body);
    const now = Date.now();
    const id = randomUUID();
    const hash = await bcrypt.hash(body.password, 10);

    try {
      app.db
        .prepare(
          'INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)',
        )
        .run(id, body.email, hash, body.name ?? null, now);
    } catch (e: any) {
      if (String(e.message).includes('UNIQUE')) {
        return reply.code(409).send({ error: '邮箱已注册' });
      }
      throw e;
    }

    const token = app.jwt.sign({ uid: id, email: body.email });
    return { token };
  });

  const signinSchema = z.object({ email: z.string().email(), password: z.string().min(6) });
  app.post('/auth/signin', async (req, reply) => {
    const body = signinSchema.parse(req.body);
    const row = app.db.prepare('SELECT * FROM users WHERE email=?').get(body.email);
    if (!row) return reply.code(401).send({ error: '账号或密码错误' });
    const ok = await bcrypt.compare(body.password, row.password_hash);
    if (!ok) return reply.code(401).send({ error: '账号或密码错误' });
    const token = app.jwt.sign({ uid: row.id, email: row.email });
    return { token };
  });
}
