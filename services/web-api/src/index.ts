// 使用包名导入；tsconfig.paths 已指向源码目录（仅供类型解析），运行时由构建或容器解析
import { initSqlite } from '@cuemate/data-sqlite';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { config } from 'dotenv';
import Fastify from 'fastify';
import { registerAuthRoutes } from './routes/auth.js';
import { registerPromptRoutes } from './routes/prompts.js';

config();

async function start() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: '*', credentials: true });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  await app.register(jwt, { secret: process.env.JWT_SECRET || 'dev-secret' });

  // 初始化 SQLite（better-sqlite3）
  const db = initSqlite(process.env.SQLITE_PATH || './cuemate.db');
  app.decorate('db', db);

  // 路由
  registerAuthRoutes(app);
  registerPromptRoutes(app);

  app.get('/health', async () => ({ status: 'ok', timestamp: Date.now() }));

  const port = Number(process.env.WEB_API_PORT || 3004);
  const host = process.env.WEB_API_HOST || '0.0.0.0';
  await app.listen({ port, host });
  app.log.info(`Web API running at http://${host}:${port}`);
}

start();
