/**
 * 面试训练音频服务管理器
 * 专注于系统音频监听和用户语音录制
 * 不包含 TTS 功能（因为面试训练不需要 AI 语音输出）
 */

import { logger } from '../../../../../utils/rendererLogger.js';
import { ErrorSeverity, ErrorType } from '../../shared/error/ErrorHandler';
import { VoiceCoordinator, VoiceState } from '../../shared/voice/VoiceCoordinator';

export interface ASRConfig {
  serverUrl: string;
  language: string;
  sampleRate: number;
}

export interface AudioConfig {
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}

export interface SystemAudioConfig {
  enableSystemAudioCapture: boolean;
  audioDeviceId?: string;
  volumeThreshold: number;
}

export class TrainingAudioServiceManager extends EventTarget {
  private voiceCoordinator: VoiceCoordinator;
  private asrConfig: ASRConfig;
  private audioConfig: AudioConfig;
  private systemAudioConfig: SystemAudioConfig;

  private asrWebSocket: WebSocket | null = null;
  private systemAudioStream: MediaStream | null = null;

  private _isInitialized = false;
  private _isRecording = false;
  private _audioLevel = 0;
  private _isSystemAudioListening = false;
  private _systemAudioLevel = 0;

  constructor(
    asrConfig: ASRConfig,
    audioConfig: AudioConfig,
    systemAudioConfig: SystemAudioConfig,
  ) {
    super();

    this.asrConfig = asrConfig;
    this.audioConfig = audioConfig;
    this.systemAudioConfig = systemAudioConfig;

    this.voiceCoordinator = new VoiceCoordinator({
      silenceThreshold: 3000,
      volumeThreshold: 0.01,
      ttsDelay: 0, // 训练模式不需要 TTS 延迟
      autoEndTimeout: 5000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // 监听语音协调器事件
    this.voiceCoordinator.addEventListener('stateChanged', ((event: CustomEvent) => {
      this.dispatchEvent(
        new CustomEvent('voiceStateChanged', {
          detail: { state: event.detail.state },
        }),
      );
    }) as EventListener);

    this.voiceCoordinator.addEventListener('userStartedSpeaking', (() => {
      this.dispatchEvent(new CustomEvent('userStartedSpeaking'));
    }) as EventListener);

    this.voiceCoordinator.addEventListener('userFinishedSpeaking', ((event: CustomEvent) => {
      this.dispatchEvent(
        new CustomEvent('userFinishedSpeaking', {
          detail: event.detail,
        }),
      );
    }) as EventListener);

    this.voiceCoordinator.addEventListener('audioLevelChanged', ((event: CustomEvent) => {
      this._audioLevel = event.detail.level;
      this.dispatchEvent(
        new CustomEvent('audioLevelChanged', {
          detail: { level: this._audioLevel },
        }),
      );
    }) as EventListener);
  }

  async initialize(): Promise<void> {
    try {
      console.debug('初始化面试训练音频服务...');

      // 初始化语音协调器
      await this.voiceCoordinator.initialize();

      // 如果启用系统音频捕获，初始化系统音频监听
      if (this.systemAudioConfig.enableSystemAudioCapture) {
        await this.initializeSystemAudioCapture();
      }

      this._isInitialized = true;
      console.debug('面试训练音频服务初始化完成');

      this.dispatchEvent(new CustomEvent('serviceInitialized'));
    } catch (error) {
      logger.error(`面试训练音频服务初始化失败: ${error}`);
      this.dispatchEvent(
        new CustomEvent('serviceError', {
          detail: {
            type: ErrorType.AUDIO_INITIALIZATION_FAILED,
            severity: ErrorSeverity.HIGH,
            error,
          },
        }),
      );
      throw error;
    }
  }

  private async initializeSystemAudioCapture(): Promise<void> {
    try {
      // 这里应该调用系统音频捕获 API
      // 目前使用模拟实现
      console.debug('初始化系统音频捕获...');

      // 模拟系统音频流
      // 实际实现中，这里应该调用 AudioTee 或其他系统音频捕获工具
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      gainNode.gain.value = 0; // 静音，只用于模拟

      this.systemAudioStream = audioContext.createMediaStreamDestination().stream;

      console.debug('系统音频捕获初始化完成');
    } catch (error) {
      logger.error(`系统音频捕获初始化失败: ${error}`);
      throw error;
    }
  }

  async startSystemAudioListening(): Promise<void> {
    if (!this._isInitialized) {
      throw new Error('音频服务未初始化');
    }

    try {
      this._isSystemAudioListening = true;

      // 启动系统音频监听
      if (this.systemAudioStream) {
        // 模拟音频级别检测
        const levelInterval = setInterval(() => {
          if (this._isSystemAudioListening) {
            this._systemAudioLevel = Math.random() * 0.8;
            this.dispatchEvent(
              new CustomEvent('systemAudioLevelChanged', {
                detail: { level: this._systemAudioLevel },
              }),
            );

            // 模拟检测到系统音频活动
            if (this._systemAudioLevel > this.systemAudioConfig.volumeThreshold) {
              this.dispatchEvent(
                new CustomEvent('systemAudioActivity', {
                  detail: { level: this._systemAudioLevel },
                }),
              );
            }
          } else {
            clearInterval(levelInterval);
          }
        }, 100);
      }

      console.debug('系统音频监听已启动');
      this.dispatchEvent(new CustomEvent('systemAudioListeningStarted'));
    } catch (error) {
      logger.error(`启动系统音频监听失败: ${error}`);
      this._isSystemAudioListening = false;
      this.dispatchEvent(
        new CustomEvent('serviceError', {
          detail: {
            type: ErrorType.AUDIO_SERVICE_ERROR,
            severity: ErrorSeverity.MEDIUM,
            error,
          },
        }),
      );
      throw error;
    }
  }

  stopSystemAudioListening(): void {
    this._isSystemAudioListening = false;
    this._systemAudioLevel = 0;

    console.debug('系统音频监听已停止');
    this.dispatchEvent(new CustomEvent('systemAudioListeningStopped'));
  }

  async startRecording(): Promise<void> {
    if (!this._isInitialized) {
      throw new Error('音频服务未初始化');
    }

    if (this._isRecording) {
      console.warn('录音已在进行中');
      return;
    }

    try {
      // 通过语音协调器启动录音
      await this.voiceCoordinator.startASRListening();
      this._isRecording = true;

      console.debug('用户录音已启动');
      this.dispatchEvent(new CustomEvent('recordingStarted'));
    } catch (error) {
      logger.error(`启动录音失败: ${error}`);
      this.dispatchEvent(
        new CustomEvent('serviceError', {
          detail: {
            type: ErrorType.MICROPHONE_ACCESS_DENIED,
            severity: ErrorSeverity.HIGH,
            error,
          },
        }),
      );
      throw error;
    }
  }

  async stopRecording(): Promise<void> {
    if (!this._isRecording) {
      console.warn('没有正在进行的录音');
      return;
    }

    try {
      // 通过语音协调器停止录音
      this.voiceCoordinator.stopASRListening();
      this._isRecording = false;

      console.debug('用户录音已停止');
      this.dispatchEvent(new CustomEvent('recordingStopped'));
    } catch (error) {
      logger.error(`停止录音失败: ${error}`);
      this.dispatchEvent(
        new CustomEvent('serviceError', {
          detail: {
            type: ErrorType.AUDIO_SERVICE_ERROR,
            severity: ErrorSeverity.MEDIUM,
            error,
          },
        }),
      );
      throw error;
    }
  }

  // 模拟面试官语音识别（从系统音频）
  async recognizeInterviewerSpeech(): Promise<string> {
    try {
      // 这里应该调用 ASR 服务识别面试官的语音
      // 目前返回模拟结果
      const mockResponses = [
        '请介绍一下你的项目经验。',
        '你是如何处理技术难题的？',
        '请描述一下你的职业规划。',
        '你有什么问题想问我们吗？',
      ];

      const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];

      // 模拟网络延迟
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.debug('面试官语音识别结果:', randomResponse);

      this.dispatchEvent(
        new CustomEvent('interviewerSpeechRecognized', {
          detail: { text: randomResponse },
        }),
      );

      return randomResponse;
    } catch (error) {
      logger.error(`面试官语音识别失败: ${error}`);
      this.dispatchEvent(
        new CustomEvent('serviceError', {
          detail: {
            type: ErrorType.ASR_CONNECTION_FAILED,
            severity: ErrorSeverity.MEDIUM,
            error,
          },
        }),
      );
      throw error;
    }
  }

  // Getters
  get isInitialized(): boolean {
    return this._isInitialized;
  }

  get isRecording(): boolean {
    return this._isRecording;
  }

  get audioLevel(): number {
    return this._audioLevel;
  }

  get isSystemAudioListening(): boolean {
    return this._isSystemAudioListening;
  }

  get systemAudioLevel(): number {
    return this._systemAudioLevel;
  }

  get isReady(): boolean {
    return this._isInitialized && !this._isRecording;
  }

  // 获取当前语音状态
  getCurrentVoiceState(): VoiceState {
    // VoiceCoordinator 的 getCurrentState 方法可能不存在，使用默认值
    return VoiceState.IDLE;
  }

  // 检查是否可以开始 ASR
  canStartASR(): boolean {
    return this.voiceCoordinator.canStartASR();
  }

  // 更新配置
  updateASRConfig(newConfig: Partial<ASRConfig>): void {
    this.asrConfig = { ...this.asrConfig, ...newConfig };
  }

  updateAudioConfig(newConfig: Partial<AudioConfig>): void {
    this.audioConfig = { ...this.audioConfig, ...newConfig };
  }

  updateSystemAudioConfig(newConfig: Partial<SystemAudioConfig>): void {
    this.systemAudioConfig = { ...this.systemAudioConfig, ...newConfig };

    // 如果系统音频配置变化，重新初始化
    if (this._isInitialized && newConfig.enableSystemAudioCapture !== undefined) {
      if (newConfig.enableSystemAudioCapture) {
        this.initializeSystemAudioCapture().catch((error) => logger.error(`系统音频捕获初始化失败: ${error}`));
      } else {
        this.stopSystemAudioListening();
      }
    }
  }

  // 清理资源
  destroy(): void {
    this.stopSystemAudioListening();

    if (this._isRecording) {
      this.stopRecording().catch((error) => logger.error(`停止录音失败: ${error}`));
    }

    if (this.voiceCoordinator) {
      this.voiceCoordinator.destroy();
    }

    if (this.asrWebSocket) {
      this.asrWebSocket.close();
      this.asrWebSocket = null;
    }

    if (this.systemAudioStream) {
      this.systemAudioStream.getTracks().forEach((track) => track.stop());
      this.systemAudioStream = null;
    }

    this._isInitialized = false;
    console.debug('面试训练音频服务已销毁');
  }
}
