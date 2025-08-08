import { Server, Socket } from 'socket.io';
import { config } from '../config/index.js';
import { AudioProcessor } from '../processors/audio.js';
import { DeepgramProvider } from '../providers/deepgram.js';
import { WhisperProvider } from '../providers/whisper.js';
import { logger } from '../utils/logger.js';

interface SessionData {
  sessionId: string;
  provider: 'deepgram' | 'whisper';
  startTime: number;
  audioProcessor: AudioProcessor;
  activeProvider?: DeepgramProvider | WhisperProvider;
}

const sessions = new Map<string, SessionData>();

export function createSocketHandlers(
  io: Server,
  providers: {
    deepgram: DeepgramProvider;
    whisper: WhisperProvider;
  },
  _audioProcessor: AudioProcessor,
) {
  io.on('connection', (socket: Socket) => {
    logger.info(`Client connected: ${socket.id}`);

    const session: SessionData = {
      sessionId: socket.id,
      provider: config.fallback.primaryProvider,
      startTime: Date.now(),
      audioProcessor: new AudioProcessor(config.audio),
    };

    sessions.set(socket.id, session);

    // 处理音频流
    socket.on('audio:stream', async (data: ArrayBuffer) => {
      try {
        const session = sessions.get(socket.id);
        if (!session) {
          logger.error(`Session not found: ${socket.id}`);
          return;
        }

        // 处理音频数据
        const processedAudio = session.audioProcessor.processAudioData(data);

        if (processedAudio.length === 0) {
          return;
        }

        // 计算音频电平并发送给客户端
        const level = session.audioProcessor.calculateLevel(processedAudio);
        socket.emit('audio:level', { level });

        // 检测静音
        // 可用于 VAD 的电平判定（预留，当前未使用）
        // const isSilent = session.audioProcessor.isSilent(processedAudio);

        // 根据配置选择 ASR 提供者
        if (session.provider === 'deepgram' && providers.deepgram.isAvailable()) {
          await handleDeepgramStream(socket, providers.deepgram, processedAudio, session);
        } else if (session.provider === 'whisper' || config.fallback.enabled) {
          await handleWhisperStream(socket, providers.whisper, processedAudio, session);
        }
      } catch (error) {
        logger.error('Error processing audio stream:', error);
        socket.emit('error', { message: 'Audio processing failed' });
      }
    });

    // 开始转写会话
    socket.on('transcription:start', async (options: { provider?: string; language?: string }) => {
      try {
        const session = sessions.get(socket.id);
        if (!session) {
          throw new Error('Session not found');
        }

        // 设置提供者
        if (options.provider === 'deepgram' || options.provider === 'whisper') {
          session.provider = options.provider;
        }

        // 初始化提供者连接
        if (session.provider === 'deepgram' && providers.deepgram.isAvailable()) {
          if (!session.activeProvider) {
            const deepgramInstance = new DeepgramProvider(config.deepgram);

            deepgramInstance.on('transcript', (transcript) => {
              socket.emit(transcript.isFinal ? 'transcript:final' : 'transcript:partial', {
                text: transcript.text,
                confidence: transcript.confidence,
                timestamp: transcript.timestamp,
                words: transcript.words,
              });
            });

            deepgramInstance.on('error', (error) => {
              logger.error('Deepgram error:', error);
              if (config.fallback.enabled) {
                logger.info('Switching to fallback provider');
                session.provider = 'whisper';
              }
            });

            await deepgramInstance.connect();
            session.activeProvider = deepgramInstance;
          }
        } else if (session.provider === 'whisper') {
          if (!session.activeProvider) {
            const whisperInstance = new WhisperProvider(config.whisper);

            whisperInstance.on('transcript', (transcript) => {
              socket.emit('transcript:final', {
                text: transcript.text,
                confidence: transcript.confidence,
                timestamp: transcript.timestamp,
              });
            });

            await whisperInstance.initialize();
            session.activeProvider = whisperInstance;
          }
        }

        socket.emit('transcription:started', {
          provider: session.provider,
          sessionId: session.sessionId,
        });
      } catch (error) {
        logger.error('Failed to start transcription:', error);
        socket.emit('error', { message: 'Failed to start transcription' });
      }
    });

    // 停止转写会话
    socket.on('transcription:stop', async () => {
      try {
        const session = sessions.get(socket.id);
        if (session?.activeProvider) {
          await session.activeProvider.disconnect();
          session.activeProvider = undefined;
        }
        socket.emit('transcription:stopped');
      } catch (error) {
        logger.error('Failed to stop transcription:', error);
      }
    });

    // 切换 ASR 提供者
    socket.on('provider:switch', async (provider: 'deepgram' | 'whisper') => {
      try {
        const session = sessions.get(socket.id);
        if (!session) {
          throw new Error('Session not found');
        }

        // 断开当前提供者
        if (session.activeProvider) {
          await session.activeProvider.disconnect();
          session.activeProvider = undefined;
        }

        // 切换提供者
        session.provider = provider;

        socket.emit('provider:switched', { provider });
      } catch (error) {
        logger.error('Failed to switch provider:', error);
        socket.emit('error', { message: 'Failed to switch provider' });
      }
    });

    // 获取会话统计
    socket.on('stats:get', () => {
      const session = sessions.get(socket.id);
      if (session) {
        socket.emit('stats:data', {
          sessionId: session.sessionId,
          provider: session.provider,
          duration: Date.now() - session.startTime,
          frameCount: session.audioProcessor.getFrameCount(),
          bufferSize: session.audioProcessor.getBufferSize(),
        });
      }
    });

    // 断开连接
    socket.on('disconnect', async () => {
      logger.info(`Client disconnected: ${socket.id}`);

      const session = sessions.get(socket.id);
      if (session) {
        if (session.activeProvider) {
          await session.activeProvider.disconnect();
        }
        sessions.delete(socket.id);
      }
    });
  });
}

async function handleDeepgramStream(
  socket: Socket,
  _provider: DeepgramProvider,
  audioBuffer: Buffer,
  session: SessionData,
) {
  try {
    if (session.activeProvider instanceof DeepgramProvider) {
      await session.activeProvider.sendAudio(audioBuffer as unknown as ArrayBuffer);
    }
  } catch (error) {
    logger.error('Deepgram streaming failed:', error);

    if (config.fallback.enabled) {
      logger.info('Falling back to Whisper');
      session.provider = 'whisper';
      socket.emit('provider:fallback', { from: 'deepgram', to: 'whisper' });
    }
  }
}

async function handleWhisperStream(
  socket: Socket,
  _provider: WhisperProvider,
  audioBuffer: Buffer,
  session: SessionData,
) {
  try {
    if (session.activeProvider instanceof WhisperProvider) {
      await session.activeProvider.processAudio(audioBuffer as unknown as ArrayBuffer);
    }
  } catch (error) {
    logger.error('Whisper processing failed:', error);
    socket.emit('error', { message: 'Local ASR processing failed' });
  }
}
