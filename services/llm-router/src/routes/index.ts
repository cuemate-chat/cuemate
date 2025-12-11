import { FastifyInstance } from 'fastify';
import { LLMManager } from '../managers/llm-manager.js';
import { AliyunProvider } from '../providers/aliyun.js';
import { AnthropicProvider } from '../providers/anthropic.js';
import { AzureOpenAIProvider } from '../providers/azure-openai.js';
import { BaichuanProvider } from '../providers/baichuan.js';
import { BaiduProvider } from '../providers/baidu.js';
import { BaseLLMProvider, CompletionRequest, RuntimeConfig } from '../providers/base.js';
import { BedrockProvider } from '../providers/bedrock.js';
import { DeepSeekProvider } from '../providers/deepseek.js';
import { GeminiProvider } from '../providers/gemini.js';
import { KimiProvider } from '../providers/kimi.js';
import { MiniMaxProvider } from '../providers/minimax.js';
import { MoonshotProvider } from '../providers/moonshot.js';
import { OllamaProvider } from '../providers/ollama.js';
import { OpenAIProvider } from '../providers/openai.js';
import { QwenProvider } from '../providers/qwen.js';
import { RegoloProvider } from '../providers/regolo.js';
import { SenseNovaProvider } from '../providers/sensenova.js';
import { SiliconFlowProvider } from '../providers/siliconflow.js';
import { StepFunProvider } from '../providers/stepfun.js';
import { TencentCloudProvider } from '../providers/tencent-cloud.js';
import { TencentProvider } from '../providers/tencent.js';
import { VllmProvider } from '../providers/vllm.js';
import { VolcEngineProvider } from '../providers/volcengine.js';
import { XfProvider } from '../providers/xf.js';
import { XinferenceProvider } from '../providers/xinference.js';
import { ZhipuProvider } from '../providers/zhipu.js';
import { createModuleLogger } from '../utils/logger.js';

const log = createModuleLogger('Routes');

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

      // 记录收到的 model_params
      log.info('completion', 'Request params', {
        provider: body.provider,
        model: body.model,
        model_params: body.model_params,
      });

      // 从请求体中移除配置字段，保留消息内容
      const { provider, model, credentials, model_params, ...cleanedBody } = body;
      const response = await llmManager.complete(cleanedBody, runtimeConfig);

      // 检查返回内容是否包含有效 JSON，如果不包含则记录警告日志
      if (response.content && !response.content.match(/\{[\s\S]*\}/)) {
        log.warn('completion', 'LLM response may not contain valid JSON', {
          provider: body.provider,
          model: body.model,
          content: response.content,
        });
      }

      return response;
    } catch (error) {
      log.error('completion', 'Completion request failed', {}, error);
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
        log.error('stream', 'Stream processing failed', {}, streamError);
        // Headers already sent, write error as SSE event
        reply.raw.write(
          `data: ${JSON.stringify({ error: streamError instanceof Error ? streamError.message : 'Stream failed' })}\n\n`,
        );
        reply.raw.end();
      }
      return;
    } catch (error) {
      log.error('stream', 'Stream request failed', {}, error);
      // Only send error response if headers not yet sent
      if (!reply.raw.headersSent) {
        return reply.code(500).send({
          error: 'Stream failed',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      reply.raw.end();
    }
  });

  // 动态探测：根据传入配置构造 provider 并执行 healthCheck
  fastify.post('/providers/probe', async (request, reply) => {
    try {
      const body = (request.body as any) || {};
      const providerId: string = body.provider || body.id || 'custom';
      const model = body.modelName || body.model_name || body.model;

      // 动态提取凭证字段和运行参数
      const allParams = body.allParams || {};
      const config: any = { model };

      // 动态传递所有凭证字段，不假设固定的字段名
      // 每个 provider 的 credentialFields 都不同，需要传递所有字段
      Object.keys(body).forEach((key) => {
        // 跳过非凭证字段
        if (
          !['provider', 'id', 'modelName', 'model_name', 'model', 'mode', 'allParams'].includes(key)
        ) {
          config[key] = body[key];
        }
      });

      // 调试日志：显示映射后的配置
      log.info('probe', 'Field mapping result', {
        originalFields: Object.keys(body).filter(
          (key) =>
            !['provider', 'id', 'modelName', 'model_name', 'model', 'mode', 'allParams'].includes(
              key,
            ),
        ),
        mappedConfig: config,
      });

      // 添加所有运行参数到配置中
      Object.assign(config, allParams);

      // 调试日志
      log.info('probe', `Probe config for ${providerId}`, { config, body });

      let chatOk: boolean | undefined;
      let chatError: string | undefined;

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
        case 'aliyun-bailian':
          provider = new AliyunProvider();
          break;
        case 'tencent-cloud':
          provider = new TencentCloudProvider();
          break;
        case 'xf':
          provider = new XfProvider();
          break;
        case 'xinference':
          provider = new XinferenceProvider();
          break;
        case 'regolo':
          provider = new RegoloProvider();
          break;
        case 'baidu':
          provider = new BaiduProvider();
          break;
        case 'minimax':
          provider = new MiniMaxProvider();
          break;
        case 'stepfun':
          provider = new StepFunProvider();
          break;
        case 'sensenova':
          provider = new SenseNovaProvider();
          break;
        case 'baichuan':
          provider = new BaichuanProvider();
          break;
        default:
          return reply.code(400).send({
            error: `Unknown provider: ${providerId}. Please use one of: openai, anthropic, azure-openai, ollama, deepseek, kimi, gemini, qwen, zhipu, siliconflow, tencent, volcengine, vllm, moonshot, bedrock, aliyun-bailian, tencent-cloud, xf, xinference, regolo, baidu, yi, minimax, stepfun, sensenova, baichuan`,
          });
      }

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
        log.error('probe', 'Chat health check failed', {}, error);
        chatOk = false;
        chatError = error instanceof Error ? error.message : String(error);
      }

      const ok = !!chatOk;

      // 构建包含错误信息的响应
      const response: any = { ok };
      if (chatError) response.error = chatError;

      return response;
    } catch (error) {
      return reply.code(200).send({ ok: false, error: (error as any)?.message || 'probe failed' });
    }
  });
}
