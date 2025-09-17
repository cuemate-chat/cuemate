import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { buildPrefixedError } from '../utils/error-response.js';
import { logOperation, OPERATION_MAPPING } from '../utils/operation-logger-helper.js';
import { OperationType } from '../utils/operation-logger.js';
import { syncASRConfig, syncASRConfigWithRetry } from '../utils/asr-config-sync.js';

const configSchema = z.object({
  name: z.string().min(1).max(50).default('ASR-Gateway'),
  language: z.string().min(1).max(10).default('zh'),
  model: z.string().min(1).default('small'),
  backend: z
    .enum(['faster-whisper', 'whisper_timestamped', 'mlx-whisper', 'openai-api', 'simulstreaming'])
    .default('simulstreaming'),
  task: z.enum(['transcribe', 'translate']).default('transcribe'),
  min_chunk_size: z.number().min(0.1).max(10).default(1.0),
  no_vad: z.boolean().default(false),
  no_vac: z.boolean().default(false),
  vac_chunk_size: z.number().nullable().default(1.0),
  confidence_validation: z.boolean().default(false),
  diarization: z.boolean().default(false),
  punctuation_split: z.boolean().default(true),
  diarization_backend: z.enum(['sortformer', 'diart']).default('sortformer'),
  buffer_trimming: z.enum(['sentence', 'segment']).default('segment'),
  buffer_trimming_sec: z.number().nullable().default(5.0),
  log_level: z.enum(['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']).default('INFO'),
  frame_threshold: z.number().default(25),
  beams: z.number().default(1),
  decoder: z.enum(['beam', 'greedy', 'auto']).default('auto'),
  audio_max_len: z.number().default(30.0),
  audio_min_len: z.number().default(0.5),
  never_fire: z.boolean().default(false),
  init_prompt: z
    .string()
    .nullable()
    .default(
      '技术面试常用词汇：算法、数据结构、架构设计、性能优化、代码重构、系统设计、API接口、数据库、缓存、消息队列、微服务、容器化、云计算、人工智能、机器学习、前端开发、后端开发、全栈开发。',
    ),
  static_init_prompt: z
    .string()
    .nullable()
    .default(
      '请准确识别并转录音频内容，保持语言的自然流畅性，注意专业术语的准确性。对于技术讨论，请特别关注代码逻辑、系统架构和性能分析等内容的准确转录。',
    ),
  max_context_tokens: z.number().nullable().default(10000),
});

export function registerAsrRoutes(app: FastifyInstance) {
  // 获取当前 ASR 配置
  app.get('/asr/config', async (req) => {
    const stmt = (app as any).db.prepare('SELECT * FROM asr_config WHERE id = 1');
    const rawConfig = stmt.get();

    // 将SQLite中的0/1转换为布尔值
    const config = rawConfig
      ? {
          ...rawConfig,
          no_vad: Boolean(rawConfig.no_vad),
          no_vac: Boolean(rawConfig.no_vac),
          confidence_validation: Boolean(rawConfig.confidence_validation),
          diarization: Boolean(rawConfig.diarization),
          punctuation_split: Boolean(rawConfig.punctuation_split),
          never_fire: Boolean(rawConfig.never_fire),
        }
      : null;

    // 检查请求来源，判断如何返回WebSocket地址
    const host = req.headers.host || 'localhost:3001';
    const isDockerEnvironment = process.env.NODE_ENV === 'production';

    // 根据请求来源返回正确的WebSocket地址
    const getWebSocketUrl = (port: number, containerName: string) => {
      // 如果是从浏览器访问，始终返回localhost地址
      console.log(containerName);
      // 只有在容器间通信时才使用容器名称
      if (host.includes('localhost') || host.includes('127.0.0.1')) {
        return `ws://localhost:${port}/asr`;
      } else if (isDockerEnvironment) {
        // 如果是生产环境且不是localhost访问，返回实际主机地址
        const hostname = host.split(':')[0];
        return `ws://${hostname}:${port}/asr`;
      } else {
        return `ws://localhost:${port}/asr`;
      }
    };

    return {
      config,
      services: [
        {
          name: 'asr-user',
          url: getWebSocketUrl(8001, 'cuemate-asr-user'),
        },
        {
          name: 'asr-interviewer',
          url: getWebSocketUrl(8002, 'cuemate-asr-interviewer'),
        },
      ],
    };
  });

  // ASR 配置同步接口（独立调用）
  app.post('/asr/sync-config', async (_req, reply) => {
    try {
      app.log.info('执行ASR配置同步');

      const result = await syncASRConfigWithRetry(app);

      if (result.success) {
        return {
          success: true,
          message: result.message,
          syncResults: result.syncResults,
        };
      } else {
        return reply.code(500).send({
          success: false,
          message: result.message,
          syncResults: result.syncResults,
        });
      }
    } catch (error: any) {
      app.log.error('ASR配置同步接口调用失败:', error);
      return reply.code(500).send(buildPrefixedError('ASR配置同步失败', error, 500));
    }
  });

  // 更新 ASR 配置
  app.post('/asr/config', async (req, reply) => {
    try {
      const newConfig = configSchema.parse((req as any).body);

      app.log.info({ newConfig }, 'Updating ASR configuration');

      // 更新数据库配置
      const updateStmt = (app as any).db.prepare(`
        UPDATE asr_config SET 
          name = ?, language = ?, model = ?, backend = ?, task = ?,
          min_chunk_size = ?, no_vad = ?, no_vac = ?, vac_chunk_size = ?,
          confidence_validation = ?, diarization = ?, punctuation_split = ?,
          diarization_backend = ?, buffer_trimming = ?, buffer_trimming_sec = ?,
          log_level = ?, frame_threshold = ?, beams = ?, decoder = ?,
          audio_max_len = ?, audio_min_len = ?, never_fire = ?,
          init_prompt = ?, static_init_prompt = ?, max_context_tokens = ?,
          updated_at = strftime('%s', 'now')
        WHERE id = 1
      `);

      updateStmt.run(
        newConfig.name,
        newConfig.language,
        newConfig.model,
        newConfig.backend,
        newConfig.task,
        newConfig.min_chunk_size,
        newConfig.no_vad ? 1 : 0,
        newConfig.no_vac ? 1 : 0,
        newConfig.vac_chunk_size,
        newConfig.confidence_validation ? 1 : 0,
        newConfig.diarization ? 1 : 0,
        newConfig.punctuation_split ? 1 : 0,
        newConfig.diarization_backend,
        newConfig.buffer_trimming,
        newConfig.buffer_trimming_sec,
        newConfig.log_level,
        newConfig.frame_threshold,
        newConfig.beams,
        newConfig.decoder,
        newConfig.audio_max_len,
        newConfig.audio_min_len,
        newConfig.never_fire ? 1 : 0,
        newConfig.init_prompt,
        newConfig.static_init_prompt,
        newConfig.max_context_tokens,
      );

      // 使用新的配置同步方法
      const syncResult = await syncASRConfig(app);

      // 记录操作日志
      try {
        await req.jwtVerify();
        const payload = req.user as any;
        await logOperation(app, req, {
          ...OPERATION_MAPPING.ASR,
          resourceId: '1',
          resourceName: 'ASR配置',
          operation: OperationType.UPDATE,
          message: `更新ASR配置: ${newConfig.name}`,
          status: 'success',
          userId: payload.uid
        });
      } catch (authError) {
        // ASR配置更新不需要认证，但如果有认证信息就记录操作日志
        app.log.info('ASR配置更新未记录操作日志（无认证信息）');
      }

      return {
        success: true,
        config: newConfig,
        message: syncResult.message,
        syncResults: syncResult.syncResults,
      };
    } catch (error: any) {
      app.log.error({ err: error }, 'Failed to update ASR config');
      return reply.code(500).send(buildPrefixedError('语音识别配置保存失败', error, 500));
    }
  });
}
