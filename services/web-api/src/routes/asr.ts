import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { buildPrefixedError } from '../utils/error-response.js';
import { logOperation, OPERATION_MAPPING } from '../utils/operation-logger-helper.js';
import { OperationType } from '../utils/operation-logger.js';

const configSchema = z.object({
  name: z.string().min(1).max(50).default('ASR-Gateway'),

  // FunASR WebSocket配置
  funasr_host: z.string().min(1).default('localhost'),
  funasr_port: z.number().min(1).max(65535).default(10095),
  funasr_chunk_interval: z.number().min(1).max(20).default(5),
  funasr_chunk_size_start: z.number().min(1).max(20).default(5),
  funasr_chunk_size_middle: z.number().min(1).max(20).default(10),
  funasr_chunk_size_end: z.number().min(1).max(20).default(5),
  funasr_mode: z.enum(['online', 'offline', '2pass']).default('online'),
  funasr_sample_rate: z.number().min(8000).max(48000).default(16000),

  // AudioTee配置
  audiotee_sample_rate: z.union([z.literal(8000), z.literal(16000), z.literal(22050), z.literal(24000), z.literal(32000), z.literal(44100), z.literal(48000)]).default(16000),
  audiotee_chunk_duration: z.number().min(0.1).max(2.0).default(0.2),
  audiotee_include_processes: z.string().default('[]'),
  audiotee_exclude_processes: z.string().default('[]'),
  audiotee_mute_processes: z.boolean().default(false),

  // PiperTTS配置
  piper_default_language: z.enum(['zh-CN', 'en-US']).default('zh-CN'),
  piper_speech_speed: z.number().min(0.5).max(2.0).default(1.0),
  piper_python_path: z.string().default('python3'),

  // 设备持久化配置
  microphone_device_id: z.string().default(''),
  microphone_device_name: z.string().default('默认麦克风'),
  speaker_device_id: z.string().default(''),
  speaker_device_name: z.string().default('默认扬声器'),

  // 测试配置
  test_duration_seconds: z.number().min(10).max(300).default(60),
  recognition_timeout_seconds: z.number().min(5).max(60).default(15),
  min_recognition_length: z.number().min(1).max(50).default(5),
  max_recognition_length: z.number().min(10).max(200).default(30),
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
          audiotee_mute_processes: Boolean(rawConfig.audiotee_mute_processes),
        }
      : null;

    // 检查请求来源，判断如何返回WebSocket地址
    const host = req.headers.host || 'localhost:3001';
    const isDockerEnvironment = process.env.NODE_ENV === 'production';

    // 根据请求来源返回正确的WebSocket地址
    const getWebSocketUrl = (port: number, containerName: string) => {
      // 如果是从浏览器访问，始终返回localhost地址
      // console.debug(containerName);
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
          name: 'cuemate-asr',
          url: getWebSocketUrl(10095, 'cuemate-asr'),
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
          name = ?, funasr_host = ?, funasr_port = ?, funasr_chunk_interval = ?,
          funasr_chunk_size_start = ?, funasr_chunk_size_middle = ?, funasr_chunk_size_end = ?,
          funasr_mode = ?, funasr_sample_rate = ?, audiotee_sample_rate = ?,
          audiotee_chunk_duration = ?, audiotee_include_processes = ?, audiotee_exclude_processes = ?,
          audiotee_mute_processes = ?, piper_default_language = ?, piper_speech_speed = ?,
          piper_python_path = ?, microphone_device_id = ?, microphone_device_name = ?,
          speaker_device_id = ?, speaker_device_name = ?, test_duration_seconds = ?,
          recognition_timeout_seconds = ?, min_recognition_length = ?, max_recognition_length = ?,
          updated_at = strftime('%s', 'now')
        WHERE id = 1
      `);

      updateStmt.run(
        newConfig.name,
        newConfig.funasr_host,
        newConfig.funasr_port,
        newConfig.funasr_chunk_interval,
        newConfig.funasr_chunk_size_start,
        newConfig.funasr_chunk_size_middle,
        newConfig.funasr_chunk_size_end,
        newConfig.funasr_mode,
        newConfig.funasr_sample_rate,
        newConfig.audiotee_sample_rate,
        newConfig.audiotee_chunk_duration,
        newConfig.audiotee_include_processes,
        newConfig.audiotee_exclude_processes,
        newConfig.audiotee_mute_processes ? 1 : 0,
        newConfig.piper_default_language,
        newConfig.piper_speech_speed,
        newConfig.piper_python_path,
        newConfig.microphone_device_id,
        newConfig.microphone_device_name,
        newConfig.speaker_device_id,
        newConfig.speaker_device_name,
        newConfig.test_duration_seconds,
        newConfig.recognition_timeout_seconds,
        newConfig.min_recognition_length,
        newConfig.max_recognition_length,
      );


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
        message: '配置已保存',
      };
    } catch (error: any) {
      app.log.error({ err: error }, 'Failed to update ASR config');
      return reply.code(500).send(buildPrefixedError('语音识别配置保存失败', error, 500));
    }
  });
}
