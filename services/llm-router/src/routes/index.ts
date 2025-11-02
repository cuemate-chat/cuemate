import { FastifyInstance } from 'fastify';
import { LLMManager } from '../managers/llm-manager.js';
import { AliyunProvider } from '../providers/aliyun.js';
import { AnthropicProvider } from '../providers/anthropic.js';
import { AzureOpenAIProvider } from '../providers/azure-openai.js';
import { BaseLLMProvider, CompletionRequest, RuntimeConfig } from '../providers/base.js';
import { BedrockProvider } from '../providers/bedrock.js';
import { DeepSeekProvider } from '../providers/deepseek.js';
import { GeminiProvider } from '../providers/gemini.js';
import { KimiProvider } from '../providers/kimi.js';
import { MoonshotProvider } from '../providers/moonshot.js';
import { OllamaProvider } from '../providers/ollama.js';
import { OpenAIProvider } from '../providers/openai.js';
import { QwenProvider } from '../providers/qwen.js';
import { RegoloProvider } from '../providers/regolo.js';
import { SiliconFlowProvider } from '../providers/siliconflow.js';
import { TencentProvider } from '../providers/tencent.js';
import { TencentCloudProvider } from '../providers/tencent-cloud.js';
import { VllmProvider } from '../providers/vllm.js';
import { VolcEngineProvider } from '../providers/volcengine.js';
import { XfProvider } from '../providers/xf.js';
import { XinferenceProvider } from '../providers/xinference.js';
import { ZhipuProvider } from '../providers/zhipu.js';
import { logger } from '../utils/logger.js';

export async function createRoutes(fastify: FastifyInstance, llmManager: LLMManager) {
  // 生成完整答案
  fastify.post('/completion', async (request, reply) => {
    try {
      const body = request.body as CompletionRequest & {
        provider?: string;
        model?: string;
        credentials?: Record<string, any>;
        model_params?: Array<{ param_key: string; value: any }>;
      };

      if (!body.provider || !body.model) {
        return reply.code(400).send({ error: 'provider and model are required' });
      }

      // 构建 RuntimeConfig
      const runtimeConfig: RuntimeConfig = {
        provider: body.provider,
        model: body.model,
        credentials: body.credentials || {},
        model_params: body.model_params || [],
      };

      // 从请求体中移除配置字段，保留消息内容
      const { provider, model, credentials, model_params, ...cleanedBody } = body;
      const response = await llmManager.complete(cleanedBody, runtimeConfig);
      return response;
    } catch (error) {
      logger.error({ err: error }, 'Completion request failed');
      return reply.code(500).send({
        error: 'Completion failed',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // 流式生成答案
  fastify.post('/completion/stream', async (request, reply) => {
    try {
      const body = request.body as CompletionRequest & {
        provider?: string;
        model?: string;
        credentials?: Record<string, any>;
        model_params?: Array<{ param_key: string; value: any }>;
      };

      if (!body.provider || !body.model) {
        return reply.code(400).send({ error: 'provider and model are required' });
      }

      // 构建 RuntimeConfig
      const runtimeConfig: RuntimeConfig = {
        provider: body.provider,
        model: body.model,
        credentials: body.credentials || {},
        model_params: body.model_params || [],
      };

      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      const { provider, model, credentials, model_params, ...cleanedBody } = body;

      try {
        const stream = await llmManager.stream(cleanedBody, runtimeConfig);

        for await (const chunk of stream) {
          reply.raw.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        }

        reply.raw.write('data: [DONE]\n\n');
        reply.raw.end();
      } catch (streamError) {
        logger.error({ err: streamError }, 'Stream processing failed');
        // Headers already sent, write error as SSE event
        reply.raw.write(`data: ${JSON.stringify({ error: streamError instanceof Error ? streamError.message : 'Stream failed' })}\n\n`);
        reply.raw.end();
      }
      return;
    } catch (error) {
      logger.error({ err: error }, 'Stream request failed');
      // Only send error response if headers not yet sent
      if (!reply.raw.headersSent) {
        return reply.code(500).send({ error: 'Stream failed', message: error instanceof Error ? error.message : String(error) });
      }
      reply.raw.end();
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

      // 使用默认配置进行 outline 生成
      const defaultConfig: RuntimeConfig = {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        credentials: { api_key: '', base_url: '' },
        model_params: [
          { param_key: 'temperature', value: 0.3 },
          { param_key: 'max_tokens', value: 200 },
        ],
      };
      const response = await llmManager.complete(outlineRequest, defaultConfig);

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
      logger.error({ err: error }, 'Outline generation failed:');
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
          config[key] = body[key];
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
      let chatError: string | undefined;
      let embedError: string | undefined;

      let provider: BaseLLMProvider;
      switch (providerId) {
        case 'openai':
          provider = new OpenAIProvider();
          break;
        case 'anthropic':
          provider = new AnthropicProvider();
          break;
        case 'azure-openai':
          provider = new AzureOpenAIProvider();
          break;
        case 'ollama':
          provider = new OllamaProvider();
          break;
        case 'deepseek':
          provider = new DeepSeekProvider();
          break;
        case 'kimi':
          provider = new KimiProvider();
          break;
        case 'gemini':
          provider = new GeminiProvider();
          break;
        case 'qwen':
          provider = new QwenProvider();
          break;
        case 'zhipu':
          provider = new ZhipuProvider();
          break;
        case 'siliconflow':
          provider = new SiliconFlowProvider();
          break;
        case 'tencent':
          provider = new TencentProvider();
          break;
        case 'volcengine':
          provider = new VolcEngineProvider();
          break;
        case 'vllm':
          provider = new VllmProvider();
          break;
        case 'moonshot':
          provider = new MoonshotProvider();
          break;
        case 'bedrock':
        case 'aws-bedrock':
          provider = new BedrockProvider();
          break;
        case 'aliyun':
        case 'aliyun-bailian':
          provider = new AliyunProvider();
          break;
        case 'tencent-cloud':
          provider = new TencentCloudProvider();
          break;
        case 'xf':
        case 'iflytek':
          provider = new XfProvider();
          break;
        case 'xinference':
          provider = new XinferenceProvider();
          break;
        case 'regolo':
          provider = new RegoloProvider();
          break;
        default:
          return reply.code(400).send({
            ok: false,
            error: `Unknown provider: ${providerId}. Please use one of: openai, anthropic, azure-openai, ollama, deepseek, kimi, gemini, qwen, zhipu, siliconflow, tencent, volcengine, vllm, moonshot, bedrock, aliyun, tencent-cloud, xf, xinference, regolo`
          });
      }

      if (mode === 'chat' || mode === 'both') {
        try {
          // 构建 RuntimeConfig 用于健康检查
          const runtimeConfig: RuntimeConfig = {
            provider: providerId,
            model: model,
            credentials: config,
            model_params: [],
          };
          chatOk = await provider.healthCheck(runtimeConfig);
        } catch (error) {
          logger.error({ err: error }, 'Chat health check failed');
          chatOk = false;
          chatError = error instanceof Error ? error.message : String(error);
        }
      }

      if (mode === 'embeddings' || mode === 'both') {
        // Anthropic, Gemini, Azure OpenAI, Bedrock 等 provider 不支持 embeddings
        const providersWithoutEmbeddings = ['anthropic', 'gemini', 'azure-openai', 'bedrock', 'aws-bedrock'];
        const skipEmbeddingsTest = providersWithoutEmbeddings.includes(providerId);

        if (skipEmbeddingsTest) {
          logger.info(`Skipping embeddings test for ${providerId} (not supported)`);
          embedOk = undefined;
        } else {
          try {
            // 对于 OpenAI，通常使用相同的 API Key 和 Base URL 进行聊天和向量嵌入
            const embedBaseUrl = config.base_url;
            const embedApiKey = config.api_key;
            const embedModel = 'text-embedding-3-small';

            // 调试日志
            logger.info(`Embeddings test config:`, { embedBaseUrl, embedApiKey, embedModel });

            if (!embedApiKey || !embedBaseUrl) {
              const missingFields = [];
              if (!embedApiKey) missingFields.push('API Key');
              if (!embedBaseUrl) missingFields.push('Base URL');
              embedError = `缺少必要字段: ${missingFields.join(', ')}`;
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
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`Embeddings test failed: ${errorMessage}`);
            embedOk = false;
            embedError = errorMessage;
          }
        }
      }

      const ok =
        mode === 'chat'
          ? !!chatOk
          : mode === 'embeddings'
            ? !!embedOk
            : !!chatOk && (embedOk === undefined ? true : !!embedOk);

      // 构建包含错误信息的响应
      const response: any = { ok, chatOk, embedOk };
      if (chatError) response.chatError = chatError;
      if (embedError) response.embedError = embedError;

      return response;
    } catch (error) {
      return reply.code(200).send({ ok: false, error: (error as any)?.message || 'probe failed' });
    }
  });
}
