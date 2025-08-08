import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { LLMManager } from './managers/llm-manager.js';
import { createRoutes } from './routes/index.js';
import { initializeProviders } from './providers/index.js';

async function buildServer() {
  const fastify = Fastify({
    logger: logger,
    trustProxy: true,
    bodyLimit: 1048576, // 1MB
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
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.windowMs,
  });

  // 初始化 LLM 提供者
  const providers = await initializeProviders(config);
  
  // 初始化 LLM 管理器
  const llmManager = new LLMManager(providers, config);

  // 设置路由
  await createRoutes(fastify, llmManager);

  // 健康检查
  fastify.get('/health', async () => {
    const providerStatus = await llmManager.getProviderStatus();
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      providers: providerStatus,
    };
  });

  return fastify;
}

async function start() {
  try {
    const fastify = await buildServer();
    
    const port = config.server.port;
    const host = config.server.host;
    
    await fastify.listen({ port, host });
    
    logger.info(`🚀 LLM Router running at http://${host}:${port}`);
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
