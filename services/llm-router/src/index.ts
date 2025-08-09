import cors from '@fastify/cors';
import Fastify from 'fastify';
import { config } from './config/index.js';
import { LLMManager } from './managers/llm-manager.js';
import { initializeProviders } from './providers/index.js';
import { createRoutes } from './routes/index.js';
import { logger } from './utils/logger.js';

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

  // 已移除 helmet（开发期可选），避免 fastify 版本不匹配导致启动失败

  // 已移除 rateLimit（开发期可选），避免 fastify 版本不匹配导致启动失败

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
