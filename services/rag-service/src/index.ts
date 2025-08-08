import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import helmet from '@fastify/helmet';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { VectorStore } from './stores/vector-store.js';
import { DocumentProcessor } from './processors/document-processor.js';
import { EmbeddingService } from './services/embedding-service.js';
import { createRoutes } from './routes/index.js';

async function buildServer() {
  const fastify = Fastify({
    logger: logger,
    trustProxy: true,
    bodyLimit: 10485760, // 10MB
  });

  // 注册插件
  await fastify.register(cors, {
    origin: config.cors.origin,
    credentials: true,
  });

  await fastify.register(helmet, {
    contentSecurityPolicy: false,
  });

  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });

  // 初始化服务
  const embeddingService = new EmbeddingService(config.embeddings);
  const vectorStore = new VectorStore(config.vectorStore);
  const documentProcessor = new DocumentProcessor(config.processing);

  await vectorStore.initialize();

  // 设置路由
  await createRoutes(fastify, {
    vectorStore,
    documentProcessor,
    embeddingService,
  });

  // 健康检查
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      collections: await vectorStore.listCollections(),
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
    
    logger.info(`🚀 RAG Service running at http://${host}:${port}`);
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
