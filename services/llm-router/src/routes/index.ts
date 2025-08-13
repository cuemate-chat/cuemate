import { FastifyInstance } from 'fastify';
import { LLMManager } from '../managers/llm-manager.js';
import { CompletionRequest } from '../providers/base.js';
import { logger } from '../utils/logger.js';

export async function createRoutes(fastify: FastifyInstance, llmManager: LLMManager) {
  // 生成完整答案
  fastify.post('/completion', async (request, reply) => {
    try {
      const body = request.body as CompletionRequest;
      const response = await llmManager.complete(body);
      return response;
    } catch (error) {
      logger.error('Completion request failed:', error);
      return reply.code(500).send({ error: 'Completion failed' });
    }
  });

  // 流式生成答案
  fastify.post('/completion/stream', async (request, reply) => {
    try {
      const body = request.body as CompletionRequest;

      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      const stream = await llmManager.stream(body);

      for await (const chunk of stream) {
        reply.raw.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      reply.raw.write('data: [DONE]\n\n');
      reply.raw.end();
      return;
    } catch (error) {
      logger.error('Stream request failed:', error);
      return reply.code(500).send({ error: 'Stream failed' });
    }
  });

  // 生成要点提纲（快速响应）
  fastify.post('/outline', async (request, reply) => {
    try {
      const { text, context } = request.body as { text: string; context?: string };

      const outlineRequest: CompletionRequest = {
        messages: [
          {
            role: 'system',
            content: '你是一个专业的面试助手。根据问题生成3-5个核心要点，每个要点不超过20字。',
          },
          {
            role: 'user',
            content: context ? `背景：${context}\n\n问题：${text}` : text,
          },
        ],
        temperature: 0.3,
        maxTokens: 200,
      };

      const response = await llmManager.complete(outlineRequest);

      // 解析要点
      const points = response.content
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => line.replace(/^[\d\-\*\•]\s*/, '').trim());

      return {
        points,
        provider: response.provider,
        latency: response.latency,
      };
    } catch (error) {
      logger.error('Outline generation failed:', error);
      return reply.code(500).send({ error: 'Outline generation failed' });
    }
  });

  // 获取提供者状态
  fastify.get('/providers/status', async () => {
    const status = await llmManager.getProviderStatus();
    return { providers: status };
  });

  // 预留：从 web-api 拉取当前用户绑定模型并热更新 providers（需在部署时配置后端地址与鉴权）
  fastify.post('/providers/dynamic-sync', async () => {
    return { ok: true };
  });

  // 健康检查所有提供者
  fastify.post('/providers/health-check', async () => {
    const results = await llmManager.healthCheck();
    return {
      results: Array.from(results.entries()).map(([id, healthy]) => ({
        id,
        healthy,
      })),
    };
  });
}
