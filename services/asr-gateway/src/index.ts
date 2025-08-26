import { fastifyLoggingHooks } from '@cuemate/logger';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import Fastify from 'fastify';
import { Server } from 'socket.io';
import { HttpAsrConfigManager } from './config/http-config.js';
import { createSocketHandlers } from './handlers/socket.js';
import { AudioProcessor } from './processors/audio.js';
import { AsrProviderFactory } from './providers/factory.js';
import { createHttpRoutes } from './routes/http.js';
import { logger } from './utils/logger.js';

async function buildServer() {
  const fastify: any = Fastify({
    logger: logger as any,
    trustProxy: true,
  });

  // 注册插件
  await fastify.register(cors, {
    origin: '*', // 简化CORS配置
    credentials: true,
  });

  await fastify.register(websocket);

  // 初始化 Socket.IO
  const io = new Server(fastify.server, {
    cors: {
      origin: '*',
      credentials: true,
    },
    transports: ['websocket'],
  });

  // 全局日志钩子
  const hooks = fastifyLoggingHooks();
  fastify.addHook('onRequest', hooks.onRequest as any);
  fastify.addHook('onResponse', hooks.onResponse as any);
  hooks.setErrorHandler(fastify as any);

  // 初始化服务
  const asrConfigManager = new HttpAsrConfigManager(undefined, fastify.log);
  const asrProviderFactory = new AsrProviderFactory(fastify.log, asrConfigManager);
  const audioProcessor = new AudioProcessor({
    sampleRate: 48000,
    channels: 1,
    frameSize: 960,
  });

  // 设置处理器
  createSocketHandlers(io, asrProviderFactory as any, audioProcessor, fastify.log);

  // 设置 HTTP 路由
  createHttpRoutes(fastify, asrProviderFactory as any);

  // 健康检查
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'asr-gateway',
    };
  });

  return fastify;
}

async function start() {
  try {
    const fastify = await buildServer();

    const port = parseInt(process.env.PORT || '3002');
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });

    logger.info(`🎙️ ASR Gateway running at http://${host}:${port}`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// 启动服务
start();
