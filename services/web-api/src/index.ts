// 使用包名导入；tsconfig.paths 已指向源码目录（仅供类型解析），运行时由构建或容器解析
import { initSqlite } from '@cuemate/data-sqlite';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { config } from 'dotenv';
import Fastify from 'fastify';
import { registerAuthRoutes } from './routes/auth.js';
import { registerJobRoutes } from './routes/jobs.js';
import { registerInterviewQuestionRoutes } from './routes/questions.js';
import { registerReviewRoutes } from './routes/reviews.js';

config();

async function start() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: true, // 反射请求源，配合凭证
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  await app.register(jwt, { secret: process.env.JWT_SECRET || 'dev-secret' });

  // 初始化 SQLite（better-sqlite3）
  const db = await initSqlite(process.env.SQLITE_PATH || './cuemate.db');
  app.decorate('db', db as any);

  // 路由
  registerAuthRoutes(app as any);
  registerInterviewQuestionRoutes(app as any);
  registerJobRoutes(app as any);
  registerReviewRoutes(app as any);

  app.get('/health', async () => ({ status: 'ok', timestamp: Date.now() }));

  const port = Number(process.env.WEB_API_PORT || 3004);
  const host = process.env.WEB_API_HOST || '0.0.0.0';
  await app.listen({ port, host });
  app.log.info(`Web API running at http://${host}:${port}`);
}

start();
