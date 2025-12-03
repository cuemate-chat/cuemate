// 使用包名导入；tsconfig.paths 已指向源码目录（仅供类型解析），运行时由构建或容器解析
import { CONTAINER_IMAGES_DIR, CONTAINER_PDF_DIR, CONTAINER_SQLITE_PATH } from '@cuemate/config';
import { initSqlite } from '@cuemate/data-sqlite';
import { fastifyLoggingHooks, printBanner, printSuccessInfo } from '@cuemate/logger';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { config } from 'dotenv';
import Fastify from 'fastify';
import { registerAdsRoutes } from './routes/ads.js';
import { registerAIConversationRoutes } from './routes/ai-conversations.js';
import { registerAsrRoutes } from './routes/asr.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerDockerRoutes } from './routes/docker.js';
import { registerFileRoutes } from './routes/files.js';
import { registerJobRoutes } from './routes/jobs.js';
import { registerLicenseRoutes } from './routes/license.js';
import { registerLogRoutes } from './routes/logs.js';
import { registerModelRoutes } from './routes/models.js';
import { registerOperationLogRoutes } from './routes/operation-logs.js';
import { registerPresetQuestionRoutes } from './routes/preset-questions.js';
import { registerPromptRoutes } from './routes/prompts.js';
import { registerInterviewQuestionRoutes } from './routes/questions.js';
import { registerInterviewRoutes } from './routes/interviews.js';
import { registerReviewRoutes } from './routes/reviews.js';
import { registerVectorRoutes } from './routes/vectors.js';
import { registerVersionRoutes } from './routes/versions.js';
import { registerNotificationRoutes } from './routes/notifications.js';
import { logger as serviceLogger } from './utils/logger.js';
import { OperationLogger } from './utils/operation-logger.js';
import { CueMateWebSocketServer } from './websocket/websocket-server.js';

config();

async function start() {
  // 打印启动 banner
  const port = Number(process.env.WEB_API_PORT || 3001);
  printBanner('Web API', undefined, port);

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
  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB 文件大小限制
  });

  // 静态文件服务 - 提供图片访问（使用 Docker 挂载路径）
  await app.register(fastifyStatic, {
    root: CONTAINER_IMAGES_DIR,
    prefix: '/images/',
    decorateReply: false,
  });

  // 静态文件服务 - 提供 PDF 简历访问（使用 Docker 挂载路径）
  await app.register(fastifyStatic, {
    root: CONTAINER_PDF_DIR,
    prefix: '/pdf/',
    decorateReply: false,
  });

  // 记录时区信息（实际生效由 @cuemate/logger 内部基于环境变量自动设置）
  const tz = process.env.CUEMATE_LOG_TZ || process.env.TZ || undefined;
  if (tz) app.log.info({ tz }, 'logger-timezone');

  // 初始化 SQLite（better-sqlite3）
  const db = await initSqlite(process.env.SQLITE_PATH || CONTAINER_SQLITE_PATH);
  app.decorate('db', db as any);

  // 同步应用版本到数据库
  const appVersion = process.env.VERSION || 'v0.1.0';
  try {
    db.prepare('UPDATE users SET version = ?').run(appVersion);
    app.log.info({ version: appVersion }, '已同步应用版本到数据库');
  } catch (error: any) {
    app.log.warn({ err: error, version: appVersion }, '同步应用版本失败');
  }

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
  registerPromptRoutes(app as any);
  registerInterviewQuestionRoutes(app as any);
  registerInterviewRoutes(app as any);
  registerJobRoutes(app as any);
  registerReviewRoutes(app as any);
  registerModelRoutes(app as any);
  registerLogRoutes(app as any);
  registerVectorRoutes(app as any);
  registerFileRoutes(app as any);
  registerLicenseRoutes(app as any);
  registerAdsRoutes(app as any);
  registerOperationLogRoutes(app as any);
  registerAIConversationRoutes(app as any);
  registerDockerRoutes(app as any);
  registerVersionRoutes(app as any);
  registerNotificationRoutes(app as any);

  app.get('/health', async () => ({ status: 'ok', timestamp: Date.now() }));

  // 创建 WebSocket 服务器实例（先创建，后面再启动）
  const wsServer = new CueMateWebSocketServer();

  // 装饰 app 实例（必须在启动前完成）
  app.decorate('wsServer', wsServer);

  // 添加 WebSocket 状态查询端点（必须在启动前注册）
  app.get('/ws/status', async () => {
    const clientCounts = wsServer.getClientCounts();
    return {
      status: 'running',
      clients: clientCounts,
      timestamp: Date.now(),
    };
  });

  const host = process.env.WEB_API_HOST || '0.0.0.0';

  // 启动 Fastify 服务器
  const address = await app.listen({ port, host });
  app.log.info(`Web API running at ${address}`);

  // 将 WebSocket 服务器附加到 HTTP 服务器
  wsServer.attachToServer(app.server, port);

  // 打印成功启动信息
  printSuccessInfo('Web API', port, {
    'HTTP 地址': `http://${host}:${port}`,
    'WebSocket 地址': `ws://${host}:${port}`,
    '健康检查': `http://${host}:${port}/health`,
    'WebSocket 状态': `http://${host}:${port}/ws/status`,
  });
}

start();
