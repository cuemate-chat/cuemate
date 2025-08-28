// 使用包名导入；tsconfig.paths 已指向源码目录（仅供类型解析），运行时由构建或容器解析
import { initSqlite } from '@cuemate/data-sqlite';
import { fastifyLoggingHooks } from '@cuemate/logger';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import fastifyStatic from '@fastify/static';
import { config } from 'dotenv';
import Fastify from 'fastify';
import { registerAdsRoutes } from './routes/ads.js';
import { registerAsrRoutes } from './routes/asr.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerFileRoutes } from './routes/files.js';
import { registerJobRoutes } from './routes/jobs.js';
import { registerLicenseRoutes } from './routes/license.js';
import { registerLogRoutes } from './routes/logs.js';
import { registerModelRoutes } from './routes/models.js';
import { registerPresetQuestionRoutes } from './routes/preset-questions.js';
import { registerInterviewQuestionRoutes } from './routes/questions.js';
import { registerReviewRoutes } from './routes/reviews.js';
import { registerVectorRoutes } from './routes/vectors.js';
import { registerOperationLogRoutes } from './routes/operation-logs.js';
import { logger as serviceLogger } from './utils/logger.js';
import { OperationLogger } from './utils/operation-logger.js';

config();

async function start() {
  const app = Fastify({ logger: serviceLogger });

  await app.register(cors, {
    origin: true, // 反射请求源
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['*'],
    exposedHeaders: ['*'],
    maxAge: 86400,
  });
  await app.register(jwt, { secret: process.env.JWT_SECRET || 'dev-secret' });

  // 静态文件服务 - 提供图片访问
  await app.register(fastifyStatic, {
    root: '/opt/cuemate/images',
    prefix: '/images/',
    decorateReply: false,
  });

  // 记录时区信息（实际生效由 @cuemate/logger 内部基于环境变量自动设置）
  const tz = process.env.CUEMATE_LOG_TZ || process.env.TZ || undefined;
  if (tz) app.log.info({ tz }, 'logger-timezone');

  // 初始化 SQLite（better-sqlite3）
  const db = await initSqlite(process.env.SQLITE_PATH || './cuemate.db');
  app.decorate('db', db as any);

  // 初始化操作记录器
  const operationLogger = new OperationLogger(db);
  app.decorate('operationLogger', operationLogger);

  // 启动时检查并验证 License
  try {
    const { validateLicenseAtStartup } = await import('./utils/license-validator.js');
    await validateLicenseAtStartup(db, app.log);
  } catch (error: any) {
    app.log.error({ err: error }, 'License 检查过程中发生错误');
  }

  // 全局日志钩子
  const hooks = fastifyLoggingHooks();
  app.addHook('onRequest', hooks.onRequest as any);
  app.addHook('onResponse', hooks.onResponse as any);
  hooks.setErrorHandler(app as any);

  // 路由
  registerAuthRoutes(app as any);
  registerAsrRoutes(app as any);
  registerPresetQuestionRoutes(app as any);
  registerInterviewQuestionRoutes(app as any);
  registerJobRoutes(app as any);
  registerReviewRoutes(app as any);
  registerModelRoutes(app as any);
  registerLogRoutes(app as any);
  registerVectorRoutes(app as any);
  registerFileRoutes(app as any);
  registerLicenseRoutes(app as any);
  registerAdsRoutes(app as any);
  registerOperationLogRoutes(app as any);

  app.get('/health', async () => ({ status: 'ok', timestamp: Date.now() }));

  const port = Number(process.env.WEB_API_PORT || 3001);
  const host = process.env.WEB_API_HOST || '0.0.0.0';
  await app.listen({ port, host });
  app.log.info(`Web API running at http://${host}:${port}`);
}

start();
