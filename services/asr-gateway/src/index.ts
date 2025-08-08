import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { Server } from 'socket.io';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { DeepgramProvider } from './providers/deepgram.js';
import { WhisperProvider } from './providers/whisper.js';
import { AudioProcessor } from './processors/audio.js';
import { createSocketHandlers } from './handlers/socket.js';
import { createHttpRoutes } from './routes/http.js';

async function buildServer() {
  const fastify = Fastify({
    logger: true,
    trustProxy: true,
  });

  // 注册插件
  await fastify.register(cors, {
    origin: config.cors.origin,
    credentials: true,
  });

  await fastify.register(helmet, {
    contentSecurityPolicy: false,
  });

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  await fastify.register(websocket);

  // 初始化 Socket.IO
  const io = new Server(fastify.server, {
    cors: {
      origin: config.cors.origin,
      credentials: true,
    },
    transports: ['websocket'],
  });

  // 初始化 ASR 提供者
  const asrProviders = {
    deepgram: new DeepgramProvider(config.deepgram),
    whisper: new WhisperProvider(config.whisper),
  };

  // 初始化音频处理器
  const audioProcessor = new AudioProcessor({
    sampleRate: config.audio.sampleRate,
    channels: config.audio.channels,
    frameSize: config.audio.frameSize,
  });

  // 设置 Socket.IO 处理器
  createSocketHandlers(io, asrProviders, audioProcessor);

  // 设置 HTTP 路由
  createHttpRoutes(fastify, asrProviders);

  // 健康检查
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      providers: {
        deepgram: asrProviders.deepgram.isAvailable(),
        whisper: asrProviders.whisper.isAvailable(),
      },
    };
  });

  return { fastify, io };
}

async function start() {
  try {
    const { fastify } = await buildServer();
    
    const port = config.server.port;
    const host = config.server.host;
    
    await fastify.listen({ port, host });
    
    logger.info(`🚀 ASR Gateway running at http://${host}:${port}`);
    logger.info(`📡 WebSocket endpoint: ws://${host}:${port}`);
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
