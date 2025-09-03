import { withErrorLogging } from '@cuemate/logger';
import { setLoggerTimeZone } from '@cuemate/logger/tz';
import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { buildPrefixedError } from '../utils/error-response.js';
import { logOperation, OPERATION_MAPPING } from '../utils/operation-logger-helper.js';
import { OperationType } from '../utils/operation-logger.js';

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
    if (!row) {
      // 记录登录失败
      await logOperation(app, req, {
        ...OPERATION_MAPPING.AUTH,
        resourceId: body.account,
        operation: OperationType.LOGIN,
        message: '登录失败：账号不存在',
        status: 'failed',
        errorMessage: '账号或密码错误',
        autoGetUser: false,
      });
      return reply.code(401).send({ error: '账号或密码错误' });
    }
    const ok = await bcrypt.compare(body.password, row.password_hash);
    if (!ok) {
      // 记录登录失败
      await logOperation(app, req, {
        ...OPERATION_MAPPING.AUTH,
        resourceId: row.id,
        resourceName: row.name,
        operation: OperationType.LOGIN,
        message: '登录失败：密码错误',
        status: 'failed',
        errorMessage: '账号或密码错误',
        userId: row.id,
        userName: row.name,
        autoGetUser: false,
      });
      return reply.code(401).send({ error: '账号或密码错误' });
    }
    const token = app.jwt.sign({ uid: row.id, email: row.email });

    // 更新用户登录状态为已登录
    app.db.prepare('UPDATE users SET is_logged_in = 1 WHERE id = ?').run(row.id);

    const user = {
      id: row.id,
      email: row.email,
      name: row.name,
      created_at: row.created_at,
      theme: row.theme ?? 'system',
      locale: row.locale ?? 'zh-CN',
      timezone: row.timezone ?? 'Asia/Shanghai',
    };

    // 记录登录成功
    await logOperation(app, req, {
      ...OPERATION_MAPPING.AUTH,
      resourceId: row.id,
      resourceName: row.name,
      operation: OperationType.LOGIN,
      message: '登录成功',
      status: 'success',
      userId: row.id,
      userName: row.name,
      autoGetUser: false,
    });

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
        return reply.code(401).send(buildPrefixedError('获取当前用户失败', err, 401));
      }
    }),
  );

  // 检查用户登录状态（无需认证，用于桌面应用启动时检查）
  app.get(
    '/auth/login-status',
    withErrorLogging(app.log as any, 'auth.login-status', async (_req, reply) => {
      try {
        // 查询是否有已登录的用户（is_logged_in = 1）
        const loggedInUser = app.db
          .prepare(
            'SELECT id, email, name, created_at, theme, locale, timezone FROM users WHERE is_logged_in = 1 LIMIT 1',
          )
          .get();

        if (loggedInUser) {
          app.log.info(
            { userId: loggedInUser.id, userName: loggedInUser.name },
            '检查到已登录用户',
          );
          return {
            isLoggedIn: true,
            user: loggedInUser,
          };
        } else {
          app.log.info('检查到没有已登录用户');
          return {
            isLoggedIn: false,
          };
        }
      } catch (err) {
        app.log.error({ err }, '检查登录状态失败');
        return reply.code(500).send(buildPrefixedError('检查登录状态失败', err, 500));
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
        if (row?.timezone) setLoggerTimeZone(row.timezone);

        // 记录用户设置更新
        await logOperation(app, req, {
          ...OPERATION_MAPPING.AUTH,
          resourceId: payload.uid,
          resourceName: row?.name,
          operation: OperationType.UPDATE,
          message: `更新用户设置: ${fields.join(', ')}`,
          status: 'success',
          userId: payload.uid,
          userName: row?.name,
          autoGetUser: false,
        });

        return { success: true, user: row };
      } catch (err) {
        return reply.code(401).send(buildPrefixedError('更新用户设置失败', err, 401));
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

        // 获取用户信息用于记录
        const userRow = (app as any).db
          .prepare('SELECT id, name FROM users WHERE id = ?')
          .get(payload.uid);

        // 记录密码修改
        await logOperation(app, req, {
          ...OPERATION_MAPPING.AUTH,
          resourceId: payload.uid,
          resourceName: userRow?.name,
          operation: OperationType.UPDATE,
          message: '修改密码成功',
          status: 'success',
          userId: payload.uid,
          userName: userRow?.name,
          autoGetUser: false,
        });

        return { success: true };
      } catch (err) {
        return reply.code(401).send(buildPrefixedError('修改密码失败', err, 401));
      }
    }),
  );

  // 登出接口
  app.post(
    '/auth/signout',
    withErrorLogging(app.log as any, 'auth.signout', async (req, reply) => {
      try {
        const payload = await (req as any).jwtVerify();

        // 更新用户登录状态为未登录
        app.db.prepare('UPDATE users SET is_logged_in = 0 WHERE id = ?').run(payload.uid);

        // 获取用户信息用于记录
        const userRow = app.db.prepare('SELECT id, name FROM users WHERE id = ?').get(payload.uid);

        // 记录登出操作
        await logOperation(app, req, {
          ...OPERATION_MAPPING.AUTH,
          resourceId: payload.uid,
          resourceName: userRow?.name,
          operation: OperationType.LOGOUT,
          message: '用户登出',
          status: 'success',
          userId: payload.uid,
          userName: userRow?.name,
          autoGetUser: false,
        });

        return { success: true };
      } catch (err) {
        return reply.code(401).send(buildPrefixedError('登出失败', err, 401));
      }
    }),
  );
}
