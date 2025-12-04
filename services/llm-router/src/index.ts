import { toCamelCase, toSnakeCase } from '@cuemate/config';
import { fastifyLoggingHooks, printBanner, printSuccessInfo } from '@cuemate/logger';
import cors from '@fastify/cors';
import Fastify from 'fastify';
import { config } from './config/index.js';
import { LLMManager } from './managers/llm-manager.js';
import { createRoutes } from './routes/index.js';
import { logger, createModuleLogger } from './utils/logger.js';

const log = createModuleLogger('Server');

async function buildServer() {
  const fastify: any = Fastify({
    logger: logger as any,
    trustProxy: true,
    bodyLimit: 1048576, // 1MB
  });

  // 注册插件
  await fastify.register(cors, {
    origin: config.cors.origin,
    credentials: true,
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

  // 初始化 LLM 管理器（现在自动注册 providers）
  const llmManager = new LLMManager(config);

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
    // 打印启动 banner
    const port = config.server.port;
    const host = config.server.host;
    printBanner('LLM Router', undefined, port);

    const fastify = await buildServer();

    await fastify.listen({ port, host });

    log.info('start', `LLM Router running at http://${host}:${port}`);

    // 打印成功启动信息
    printSuccessInfo('LLM Router', port, {
      'HTTP 地址': `http://${host}:${port}`,
      健康检查: `http://${host}:${port}/health`,
      路由策略: config.routing.strategy || 'primary-fallback',
      支持提供商:
        'openai, anthropic, azure-openai, moonshot, qwen, deepseek, kimi, gemini, zhipu, siliconflow, tencent, volcengine, vllm, ollama, bedrock, aliyun-bailian, tencent-cloud, xf, xinference, regolo, baidu, yi, minimax, stepfun, sensenova, baichuan',
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
