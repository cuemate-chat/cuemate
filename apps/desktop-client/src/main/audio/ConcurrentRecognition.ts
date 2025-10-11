import { startMicrophoneRecognition, startSpeakerRecognition, MicrophoneRecognitionController, SpeakerRecognitionController } from '../../utils/audioRecognition.js';
import { logger } from '../../utils/logger.js';

interface ConcurrentRecognitionOptions {
  micDeviceId?: string;
  speakerDeviceId?: string;
  onUserSpeech?: (text: string, isFinal: boolean) => void;
  onInterviewerSpeech?: (text: string, isFinal: boolean) => void;
  onError?: (source: 'microphone' | 'speaker', error: string) => void;
}

export class ConcurrentRecognition {
  private micController: MicrophoneRecognitionController | null = null;
  private speakerController: SpeakerRecognitionController | null = null;
  private isActive = false;

  constructor(private options: ConcurrentRecognitionOptions) {}

  /**
   * 同时启动麦克风和扬声器识别
   */
  public async start(): Promise<void> {
    if (this.isActive) {
      throw new Error('并发识别已在运行中');
    }

    logger.info('开始启动并发语音识别');

    try {
      // 并发启动两个识别服务
      const [micController, speakerController] = await Promise.all([
        this.startMicrophoneRecognition(),
        this.startSpeakerRecognition(),
      ]);

      this.micController = micController;
      this.speakerController = speakerController;
      this.isActive = true;

      logger.info('并发语音识别启动成功');
    } catch (error) {
      logger.error({ err: error }, '启动并发语音识别失败:');
      await this.stop();
      throw error;
    }
  }

  /**
   * 停止所有识别
   */
  public async stop(): Promise<void> {
    logger.info('停止并发语音识别');

    this.isActive = false;

    const stopPromises: Promise<void>[] = [];

    if (this.micController) {
      stopPromises.push(this.micController.stop().catch(err =>
        logger.error({ err: err }, '停止麦克风识别失败')
      ));
      this.micController = null;
    }

    if (this.speakerController) {
      stopPromises.push(this.speakerController.stop().catch(err =>
        logger.error({ err: err }, '停止扬声器识别失败')
      ));
      this.speakerController = null;
    }

    await Promise.all(stopPromises);
    logger.info('并发语音识别已停止');
  }

  /**
   * 检查是否正在运行
   */
  public get isRunning(): boolean {
    return this.isActive;
  }

  /**
   * 启动麦克风识别
   */
  private async startMicrophoneRecognition(): Promise<MicrophoneRecognitionController> {
    return startMicrophoneRecognition({
      deviceId: this.options.micDeviceId,
      sessionId: 'user_microphone', // 唯一会话标识
      onText: (text, isFinal) => {
        this.options.onUserSpeech?.(text, isFinal || false);
      },
      onError: (errorMessage) => {
        logger.error('麦克风识别错误:', errorMessage);
        this.options.onError?.('microphone', errorMessage);
      },
      onOpen: () => {
        logger.debug('麦克风识别连接已建立');
      },
      onClose: () => {
        logger.debug('麦克风识别连接已关闭');
      },
    });
  }

  /**
   * 启动扬声器识别
   */
  private async startSpeakerRecognition(): Promise<SpeakerRecognitionController> {
    return startSpeakerRecognition({
      deviceId: this.options.speakerDeviceId,
      sessionId: 'interviewer_speaker', // 唯一会话标识
      onText: (text, isFinal) => {
        this.options.onInterviewerSpeech?.(text, isFinal || false);
      },
      onError: (errorMessage) => {
        logger.error('扬声器识别错误:', errorMessage);
        this.options.onError?.('speaker', errorMessage);
      },
      onOpen: () => {
        logger.debug('扬声器识别连接已建立');
      },
      onClose: () => {
        logger.debug('扬声器识别连接已关闭');
      },
    });
  }
}

// 使用示例
export function createConcurrentRecognition(options: ConcurrentRecognitionOptions): ConcurrentRecognition {
  return new ConcurrentRecognition(options);
}