import { FastifyInstance } from 'fastify';
import { LLMManager } from '../managers/llm-manager.js';
import { AzureOpenAIProvider } from '../providers/azure-openai.js';
import { BaseLLMProvider, CompletionRequest } from '../providers/base.js';
import { DeepSeekProvider } from '../providers/deepseek.js';
import { GeminiProvider } from '../providers/gemini.js';
import { KimiProvider } from '../providers/kimi.js';
import { OllamaProvider } from '../providers/ollama.js';
import { OpenAICompatibleProvider } from '../providers/openai-compatible.js';
import { OpenAIProvider } from '../providers/openai.js';
import { QwenProvider } from '../providers/qwen.js';
import { SiliconFlowProvider } from '../providers/siliconflow.js';
import { TencentProvider } from '../providers/tencent.js';
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
      const baseUrl = body.base_url || body.baseUrl;
      const apiKey = body.api_key || body.apiKey;
      const temperature = Number(body.temperature ?? body.params?.temperature ?? 0.7);
      const maxTokens = Number(body.max_tokens ?? body.params?.max_tokens ?? 512);
      const mode: 'chat' | 'embeddings' | 'both' = (body.mode as any) || 'chat';

      let chatOk: boolean | undefined;
      let embedOk: boolean | undefined;

      let provider: BaseLLMProvider;
      switch (providerId) {
        case 'openai':
          provider = new OpenAIProvider({ apiKey, model, temperature, maxTokens });
          break;
        case 'azure-openai':
          provider = new AzureOpenAIProvider({ baseUrl, apiKey, model, temperature, maxTokens });
          break;
        case 'ollama':
          provider = new OllamaProvider({ baseUrl, model, temperature, maxTokens });
          break;
        case 'deepseek':
          provider = new DeepSeekProvider({
            apiKey,
            model,
            baseUrl,
            temperature,
            maxTokens,
          } as any);
          break;
        case 'kimi':
          provider = new KimiProvider({ apiKey, baseUrl, model, temperature, maxTokens });
          break;
        case 'gemini':
          provider = new GeminiProvider({ apiKey, baseUrl, model, temperature, maxTokens });
          break;
        case 'qwen':
          provider = new QwenProvider({ apiKey, baseUrl, model, temperature, maxTokens });
          break;
        case 'zhipu':
          provider = new ZhipuProvider({ apiKey, baseUrl, model, temperature, maxTokens });
          break;
        case 'siliconflow':
          provider = new SiliconFlowProvider({ apiKey, baseUrl, model, temperature, maxTokens });
          break;
        case 'tencent':
          provider = new TencentProvider({ apiKey, baseUrl, model, temperature, maxTokens });
          break;
        case 'volcengine':
          provider = new VolcEngineProvider({ apiKey, baseUrl, model, temperature, maxTokens });
          break;
        default:
          provider = new OpenAICompatibleProvider({
            id: providerId,
            baseUrl,
            apiKey,
            model,
            temperature,
            maxTokens,
          });
      }

      if (mode === 'chat' || mode === 'both') {
        try {
          chatOk = await provider.healthCheck();
        } catch {
          chatOk = false;
        }
      }

      if (mode === 'embeddings' || mode === 'both') {
        try {
          const embedBaseUrl = body.embed_base_url || body.embedBaseUrl || baseUrl;
          const embedApiKey = body.embed_api_key || body.embedApiKey || apiKey;
          const embedModel = body.embed_model || body.embedModel || 'text-embedding-3-small';
          const openai = new (await import('openai')).default({
            apiKey: embedApiKey,
            baseURL: embedBaseUrl,
          });
          const r = await openai.embeddings.create({ model: embedModel, input: 'ping' });
          embedOk = !!r && !!(r as any).data?.length;
        } catch {
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
