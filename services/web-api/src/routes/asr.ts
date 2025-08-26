import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const configSchema = z.object({
  name: z.string().min(1).max(50).default('ASR-Gateway'),
  language: z.string().min(1).max(10).default('en'),
  model: z.string().min(1).default('small'),
  backend: z
    .enum(['faster-whisper', 'whisper_timestamped', 'mlx-whisper', 'openai-api', 'simulstreaming'])
    .default('simulstreaming'),
  task: z.enum(['transcribe', 'translate']).default('transcribe'),
  min_chunk_size: z.number().min(0.1).max(10).default(1.0),
  no_vad: z.boolean().default(false),
  no_vac: z.boolean().default(false),
  vac_chunk_size: z.number().optional(),
  confidence_validation: z.boolean().default(false),
  diarization: z.boolean().default(false),
  punctuation_split: z.boolean().default(true),
  diarization_backend: z.enum(['sortformer', 'diart']).default('sortformer'),
  buffer_trimming: z.enum(['sentence', 'segment']).default('segment'),
  buffer_trimming_sec: z.number().optional(),
  log_level: z.enum(['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']).default('INFO'),
  frame_threshold: z.number().default(25),
  beams: z.number().default(1),
  decoder: z.enum(['beam', 'greedy', 'auto']).default('auto'),
  audio_max_len: z.number().default(30.0),
  audio_min_len: z.number().default(0.0),
  never_fire: z.boolean().default(false),
  init_prompt: z.string().optional(),
  static_init_prompt: z.string().optional(),
  max_context_tokens: z.number().optional(),
});

export function registerAsrRoutes(app: FastifyInstance) {
  // 获取当前 ASR 配置
  app.get('/asr/config', async () => {
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

    return {
      config,
      services: [
        {
          name: 'asr-user',
          url: 'ws://localhost:8001/asr',
        },
        {
          name: 'asr-interviewer',
          url: 'ws://localhost:8002/asr',
        },
      ],
    };
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

      return {
        success: true,
        config: newConfig,
        message: '语音识别配置已保存成功',
      };
    } catch (error: any) {
      app.log.error({ err: error }, 'Failed to update ASR config');
      return reply.code(500).send({
        error: 'update_failed',
        message: error.message,
      });
    }
  });
}
