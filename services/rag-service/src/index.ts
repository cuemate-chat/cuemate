import { toCamelCase, toSnakeCase } from '@cuemate/config';
import { fastifyLoggingHooks, printBanner, printSuccessInfo } from '@cuemate/logger';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import Fastify from 'fastify';
import { config } from './config/index.js';
import { DocumentProcessor } from './processors/document-processor.js';
import { createRoutes } from './routes/index.js';
import { EmbeddingService } from './services/embedding-service.js';
import { VectorStore } from './stores/vector-store.js';
import { createModuleLogger } from './utils/logger.js';

const log = createModuleLogger('Server');

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
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
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

  // 请求转换：camelCase → snake_case（前端发送 camelCase，后端使用 snake_case）
  fastify.addHook('preHandler', async (request: any) => {
    // 转换请求体
    if (request.body && typeof request.body === 'object') {
      request.body = toSnakeCase(request.body);
    }
    // 转换查询参数
    if (request.query && typeof request.query === 'object') {
      request.query = toSnakeCase(request.query);
    }
  });

  // 响应体转换：snake_case → camelCase（后端返回 snake_case，前端期望 camelCase）
  fastify.addHook('onSend', async (_request: any, _reply: any, payload: any) => {
    if (typeof payload === 'string') {
      try {
        const parsed = JSON.parse(payload);
        const transformed = toCamelCase(parsed);
        return JSON.stringify(transformed);
      } catch {
        // 非 JSON 响应，直接返回
        return payload;
      }
    }
    return payload;
  });

  // 初始化服务
  const embeddingService = new EmbeddingService(config.embeddings);
  const vectorStore = new VectorStore(config.vectorStore, embeddingService);
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

    log.info('start', `RAG Service running at http://${host}:${port}`);

    // Print success info
    printSuccessInfo('RAG Service', port, {
      'HTTP': `http://${host}:${port}`,
      'Health Check': `http://${host}:${port}/health`,
      'Vector Store': config.vectorStore.type || 'chroma',
      'Embedding Dimensions': config.embeddings.dimensions?.toString() || '1536',
      'Chroma URL': config.vectorStore.chromaPath || 'http://cuemate-chroma:8000',
    });
  } catch (err) {
    log.error('start', 'Failed to start server', {}, err);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', async () => {
  log.info('shutdown', 'SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  log.info('shutdown', 'SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// 启动服务
start();
