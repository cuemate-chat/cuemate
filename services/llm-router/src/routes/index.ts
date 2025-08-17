import { FastifyInstance } from 'fastify';
import { LLMManager } from '../managers/llm-manager.js';
import { AzureOpenAIProvider } from '../providers/azure-openai.js';
import { BaseLLMProvider, CompletionRequest } from '../providers/base.js';
import { DeepSeekProvider } from '../providers/deepseek.js';
import { GeminiProvider } from '../providers/gemini.js';
import { KimiProvider } from '../providers/kimi.js';
import { MoonshotProvider } from '../providers/moonshot.js';
import { OllamaProvider } from '../providers/ollama.js';
import { OpenAICompatibleProvider } from '../providers/openai-compatible.js';
import { OpenAIProvider } from '../providers/openai.js';
import { QwenProvider } from '../providers/qwen.js';
import { SiliconFlowProvider } from '../providers/siliconflow.js';
import { TencentProvider } from '../providers/tencent.js';
import { VllmProvider } from '../providers/vllm.js';
import { VolcEngineProvider } from '../providers/volcengine.js';
import { ZhipuProvider } from '../providers/zhipu.js';
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

  // 动态探测：根据传入配置构造 provider 并执行 healthCheck
  fastify.post('/providers/probe', async (request, reply) => {
    try {
      const body = (request.body as any) || {};
      const providerId: string = body.provider || body.id || 'custom';
      const model = body.model_name || body.model;
      const mode: 'chat' | 'embeddings' | 'both' = (body.mode as any) || 'chat';

      // 动态提取凭证字段和运行参数
      const allParams = body.allParams || {};
      const config: any = { model };

      // 动态传递所有凭证字段，不假设固定的字段名
      // 每个 provider 的 credentialFields 都不同，需要传递所有字段
      Object.keys(body).forEach((key) => {
        // 跳过非凭证字段
        if (!['provider', 'id', 'model_name', 'model', 'mode', 'allParams'].includes(key)) {
          // 字段名映射：将前端的下划线格式转换为后端的驼峰格式
          let mappedKey = key;
          if (key === 'base_url') mappedKey = 'baseUrl';
          else if (key === 'api_key') mappedKey = 'apiKey';
          else if (key === 'api_version') mappedKey = 'apiVersion';
          else if (key === 'deployment_name') mappedKey = 'deploymentName';
          else if (key === 'embed_base_url') mappedKey = 'embedBaseUrl';
          else if (key === 'embed_api_key') mappedKey = 'embedApiKey';
          else if (key === 'embed_model') mappedKey = 'embedModel';

          config[mappedKey] = body[key];
        }
      });

      // 调试日志：显示映射后的配置
      logger.info(`Field mapping result:`, {
        originalFields: Object.keys(body).filter(
          (key) => !['provider', 'id', 'model_name', 'model', 'mode', 'allParams'].includes(key),
        ),
        mappedConfig: config,
      });

      // 添加所有运行参数到配置中
      Object.assign(config, allParams);

      // 调试日志
      logger.info(`Probe config for ${providerId}:`, { config, body });

      let chatOk: boolean | undefined;
      let embedOk: boolean | undefined;

      let provider: BaseLLMProvider;
      switch (providerId) {
        case 'openai':
          provider = new OpenAIProvider(config);
          break;
        case 'azure-openai':
          provider = new AzureOpenAIProvider(config);
          break;
        case 'ollama':
          provider = new OllamaProvider(config);
          break;
        case 'deepseek':
          provider = new DeepSeekProvider(config);
          break;
        case 'kimi':
          provider = new KimiProvider(config);
          break;
        case 'gemini':
          provider = new GeminiProvider(config);
          break;
        case 'qwen':
          provider = new QwenProvider(config);
          break;
        case 'zhipu':
          provider = new ZhipuProvider(config);
          break;
        case 'siliconflow':
          provider = new SiliconFlowProvider(config);
          break;
        case 'tencent':
          provider = new TencentProvider(config);
          break;
        case 'volcengine':
          provider = new VolcEngineProvider(config);
          break;
        case 'vllm':
          provider = new VllmProvider(config);
          break;
        case 'moonshot':
          provider = new MoonshotProvider(config);
          break;
        default:
          provider = new OpenAICompatibleProvider({ id: providerId, ...config });
      }

      if (mode === 'chat' || mode === 'both') {
        try {
          chatOk = await provider.healthCheck();
        } catch (error) {
          logger.error({ err: error }, 'Chat health check failed');
          chatOk = false;
        }
      }

      if (mode === 'embeddings' || mode === 'both') {
        try {
          // 对于 OpenAI，通常使用相同的 API Key 和 Base URL 进行聊天和向量嵌入
          const embedBaseUrl = config.baseUrl;
          const embedApiKey = config.apiKey;
          const embedModel = 'text-embedding-3-small';

          // 调试日志
          logger.info(`Embeddings test config:`, { embedBaseUrl, embedApiKey, embedModel });

          if (!embedApiKey || !embedBaseUrl) {
            logger.error('Missing required fields for embeddings test:', {
              embedApiKey: !!embedApiKey,
              embedBaseUrl: !!embedBaseUrl,
            });
            embedOk = false;
          } else {
            const openai = new (await import('openai')).default({
              apiKey: embedApiKey,
              baseURL: embedBaseUrl,
            });
            const r = await openai.embeddings.create({ model: embedModel, input: 'ping' });
            embedOk = !!r && !!(r as any).data?.length;
            logger.info(`Embeddings test result:`, { embedOk, response: r });
          }
        } catch (error) {
          console.error('Embeddings test failed:', error);
          logger.error(
            `Embeddings test failed: ${error instanceof Error ? error.message : String(error)}`,
          );
          embedOk = false;
        }
      }

      const ok =
        mode === 'chat'
          ? !!chatOk
          : mode === 'embeddings'
            ? !!embedOk
            : !!chatOk && (embedOk === undefined ? true : !!embedOk);
      return { ok, chatOk, embedOk };
    } catch (error) {
      return reply.code(200).send({ ok: false, error: (error as any)?.message || 'probe failed' });
    }
  });
}
