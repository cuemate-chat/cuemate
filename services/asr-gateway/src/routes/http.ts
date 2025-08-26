import { FastifyInstance } from 'fastify';
import { DeepgramProvider } from '../providers/deepgram.js';
import { WhisperProvider } from '../providers/whisper.js';
// 移除独立的logger导入，使用fastify.log

export function createHttpRoutes(
  fastify: FastifyInstance,
  providers: {
    deepgram: DeepgramProvider;
    whisper: WhisperProvider;
  },
) {
  // 获取可用的 ASR 提供者
  fastify.get('/providers', async () => {
    return {
      providers: [
        {
          id: 'deepgram',
          name: 'Deepgram',
          available: providers.deepgram.isAvailable(),
          type: 'cloud',
          features: ['streaming', 'realtime', 'punctuation', 'diarization'],
        },
        {
          id: 'whisper',
          name: 'OpenAI Whisper',
          available: providers.whisper.isAvailable(),
          type: 'local',
          features: ['offline', 'privacy'],
        },
      ],
    };
  });

  // 批量转写接口（用于测试或批处理）
  fastify.post('/transcribe', async (request, reply) => {
    const { audio, provider = 'deepgram', format = 'base64' } = request.body as any;

    if (!audio) {
      return reply.code(400).send({ error: 'Audio data required' });
    }

    try {
      // TODO: 批量转写逻辑（占位返回，保持类型正确）
      void { audio, provider, format };
      return { text: '', provider, timestamp: Date.now() } as const;
    } catch (error) {
      fastify.log.error({ err: error as any }, 'Transcription failed');
      return reply.code(500).send({ error: 'Transcription failed' });
    }
  });

  // 获取服务统计
  fastify.get('/stats', async () => {
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: Date.now(),
    };
  });
}
