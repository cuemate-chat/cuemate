import { fastifyLoggingHooks, printBanner, printSuccessInfo } from '@cuemate/logger';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import Fastify from 'fastify';
import { config } from './config/index.js';
import { DocumentProcessor } from './processors/document-processor.js';
import { createRoutes } from './routes/index.js';
import { EmbeddingService } from './services/embedding-service.js';
import { VectorStore } from './stores/vector-store.js';
import { logger } from './utils/logger.js';

async function buildServer() {
  const fastify: any = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
    trustProxy: true,
    bodyLimit: 10485760, // 10MB
  });

  // 注册插件
  await fastify.register(cors, {
    origin: config.cors.origin,
    credentials: true,
  });

  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });

  // 全局日志钩子
  const hooks = fastifyLoggingHooks();
  fastify.addHook('onRequest', hooks.onRequest as any);
  fastify.addHook('onResponse', hooks.onResponse as any);
  hooks.setErrorHandler(fastify as any);

  // 初始化服务
  const embeddingService = new EmbeddingService(config.embeddings);
  const vectorStore = new VectorStore(config.vectorStore);
  const documentProcessor = new DocumentProcessor(config.processing);

  await vectorStore.initialize();

  const mockModelConfig = {
    id: 'mock-embedding',
    provider: 'mock',
    model_name: 'mock-embedding',
    dimensions: config.embeddings.dimensions,
  };
  await embeddingService.setModelConfig(mockModelConfig);

  // 设置路由
  await createRoutes(fastify, {
    vectorStore,
    documentProcessor,
    embeddingService,
    config,
  });

  return fastify;
}

async function start() {
  try {
    // 打印启动 banner
    const port = config.server.port;
    const host = config.server.host;
    printBanner('RAG Service', undefined, port);

    const fastify = await buildServer();

    await fastify.listen({ port, host });

    logger.info(`RAG Service running at http://${host}:${port}`);

    // 打印成功启动信息
    printSuccessInfo('RAG Service', port, {
      'HTTP 地址': `http://${host}:${port}`,
      '健康检查': `http://${host}:${port}/health`,
      '向量存储类型': config.vectorStore.type || 'chroma',
      '嵌入维度': config.embeddings.dimensions?.toString() || '1536',
      'Chroma 地址': config.vectorStore.chromaPath || 'http://cuemate-chroma:8000',
    });
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
