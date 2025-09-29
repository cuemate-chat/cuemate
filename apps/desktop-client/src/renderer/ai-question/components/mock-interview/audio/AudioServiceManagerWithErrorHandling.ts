/**
 * 带错误处理的音频服务管理器
 * 集成错误处理和自动恢复机制的AudioServiceManager
 */

import { AudioServiceManager, ASRConfig, TTSConfig, AudioConfig, TTSResult } from './AudioServiceManager';
import { ErrorHandler, ErrorType, ErrorSeverity } from '../error/ErrorHandler';

export interface ErrorHandlingOptions {
  enableAutoRetry?: boolean;
  maxRetryAttempts?: number;
  retryDelay?: number;
  enableFallbackMode?: boolean;
  logErrors?: boolean;
}

export class AudioServiceManagerWithErrorHandling extends AudioServiceManager {
  private errorHandler: ErrorHandler;
  private errorHandlingOptions: ErrorHandlingOptions;
  private connectionRetryCount = 0;
  private lastConnectionAttempt = 0;
  private fallbackMode = false;

  constructor(
    asrConfig: ASRConfig,
    ttsConfig: TTSConfig,
    audioConfig: AudioConfig = {},
    errorHandlingOptions: ErrorHandlingOptions = {}
  ) {
    super(asrConfig, ttsConfig, audioConfig);

    this.errorHandlingOptions = {
      enableAutoRetry: true,
      maxRetryAttempts: 3,
      retryDelay: 2000,
      enableFallbackMode: true,
      logErrors: true,
      ...errorHandlingOptions
    };

    this.errorHandler = new ErrorHandler();
    this.setupErrorHandling();
  }

  // 设置错误处理
  private setupErrorHandling(): void {
    // 监听错误处理器的恢复事件
    this.errorHandler.addEventListener('retryASRConnection', () => {
      this.retryASRConnection();
    });

    this.errorHandler.addEventListener('switchToTextInput', () => {
      this.enableFallbackMode();
    });

    this.errorHandler.addEventListener('retryTTS', () => {
      this.retryTTSService();
    });

    this.errorHandler.addEventListener('continueTextMode', () => {
      this.enableFallbackMode();
    });

    this.errorHandler.addEventListener('microphonePermissionGranted', () => {
      this.retryMediaStreamInitialization();
    });
  }

  // 增强的初始化方法
  async initialize(): Promise<void> {
    try {
      await this.initializeWithErrorHandling();
    } catch (error) {
      this.handleInitializationError(error as Error);
      throw error;
    }
  }

  private async initializeWithErrorHandling(): Promise<void> {
    try {
      // 尝试原始初始化流程
      await super.initialize();
    } catch (error) {
      const handledError = this.errorHandler.handleError(error as Error, {
        operation: 'initialization',
        timestamp: Date.now()
      });

      if (handledError.shouldRetry && this.errorHandlingOptions.enableAutoRetry) {
        await this.delayedRetry(handledError.retryDelay || this.errorHandlingOptions.retryDelay!);
        return this.initializeWithErrorHandling();
      }

      throw error;
    }
  }

  // 处理初始化错误
  private handleInitializationError(error: Error): void {
    let errorType = ErrorType.AUDIO_INITIALIZATION_FAILED;

    if (error.message.includes('getUserMedia') || error.message.includes('microphone')) {
      errorType = ErrorType.MICROPHONE_ACCESS_DENIED;
    } else if (error.message.includes('WebSocket') || error.message.includes('ASR')) {
      errorType = ErrorType.ASR_CONNECTION_FAILED;
    } else if (error.message.includes('TTS')) {
      errorType = ErrorType.TTS_SERVICE_UNAVAILABLE;
    }

    this.errorHandler.handleError({
      type: errorType,
      severity: ErrorSeverity.CRITICAL,
      message: `音频服务初始化失败: ${error.message}`,
      details: error.stack,
      timestamp: Date.now(),
      originalError: error
    });
  }

  // 增强的媒体流初始化
  protected async initializeMediaStream(): Promise<void> {
    try {
      await super.initializeMediaStream();
      this.connectionRetryCount = 0; // 重置重试计数
    } catch (error) {
      const handledError = this.errorHandler.handleError(error as Error, {
        operation: 'mediaStreamInit',
        deviceId: this.audioConfig.microphoneDeviceId
      });

      if (handledError.shouldRetry && this.shouldRetryConnection()) {
        await this.delayedRetry(handledError.retryDelay || this.errorHandlingOptions.retryDelay!);
        return this.initializeMediaStream();
      }

      if (this.errorHandlingOptions.enableFallbackMode) {
        this.enableFallbackMode();
        return;
      }

      throw error;
    }
  }

  // 增强的ASR连接
  protected async connectASR(): Promise<void> {
    try {
      await super.connectASR();
      this.connectionRetryCount = 0;
      this.lastConnectionAttempt = Date.now();
    } catch (error) {
      this.connectionRetryCount++;

      const handledError = this.errorHandler.handleError(error as Error, {
        operation: 'asrConnection',
        attempt: this.connectionRetryCount,
        serverUrl: this.asrConfig.serverUrl
      });

      if (handledError.shouldRetry && this.shouldRetryConnection()) {
        await this.delayedRetry(handledError.retryDelay || this.errorHandlingOptions.retryDelay!);
        return this.connectASR();
      }

      if (this.errorHandlingOptions.enableFallbackMode) {
        this.enableFallbackMode();
        return;
      }

      throw error;
    }
  }

  // 增强的TTS播放
  async playTTS(text: string): Promise<TTSResult> {
    if (this.fallbackMode) {
      // 降级模式：只显示文本，不播放音频
      return this.fallbackTextDisplay(text);
    }

    try {
      return await super.playTTS(text);
    } catch (error) {
      const handledError = this.errorHandler.handleError(error as Error, {
        operation: 'ttsPlayback',
        text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        language: this.ttsConfig.language
      });

      if (handledError.shouldRetry && this.shouldRetryOperation('tts')) {
        await this.delayedRetry(1000); // TTS重试延迟较短
        return this.playTTS(text);
      }

      // TTS失败时降级到文本显示
      if (this.errorHandlingOptions.enableFallbackMode) {
        return this.fallbackTextDisplay(text);
      }

      throw error;
    }
  }

  // 增强的录音开始
  startRecording(): void {
    if (this.fallbackMode) {
      this.dispatchEvent(new CustomEvent('fallbackModeActive', {
        detail: { message: '当前为降级模式，请使用文字输入' }
      }));
      return;
    }

    try {
      super.startRecording();
    } catch (error) {
      this.errorHandler.handleError(error as Error, {
        operation: 'startRecording',
        voiceState: this.getVoiceState()
      });

      if (this.errorHandlingOptions.enableFallbackMode) {
        this.enableFallbackMode();
      }
    }
  }

  // 降级文本显示
  private fallbackTextDisplay(text: string): Promise<TTSResult> {
    return new Promise((resolve) => {
      const result: TTSResult = {
        audioUrl: '',
        duration: 0,
        text: text
      };

      // 立即触发完成事件
      setTimeout(() => {
        this.dispatchEvent(new CustomEvent('ttsCompleted', { detail: result }));
        this.dispatchEvent(new CustomEvent('fallbackTextDisplayed', { detail: { text } }));
        resolve(result);
      }, 100);
    });
  }

  // 启用降级模式
  private enableFallbackMode(): void {
    this.fallbackMode = true;
    this.dispatchEvent(new CustomEvent('fallbackModeEnabled', {
      detail: { message: '已切换到降级模式，部分功能可能受限' }
    }));
  }

  // 禁用降级模式
  disableFallbackMode(): void {
    this.fallbackMode = false;
    this.dispatchEvent(new CustomEvent('fallbackModeDisabled'));
  }

  // 检查是否应该重试连接
  private shouldRetryConnection(): boolean {
    if (!this.errorHandlingOptions.enableAutoRetry) {
      return false;
    }

    if (this.connectionRetryCount >= this.errorHandlingOptions.maxRetryAttempts!) {
      return false;
    }

    // 避免过于频繁的重试
    const now = Date.now();
    const timeSinceLastAttempt = now - this.lastConnectionAttempt;
    return timeSinceLastAttempt >= this.errorHandlingOptions.retryDelay!;
  }

  // 检查是否应该重试操作
  private shouldRetryOperation(operation: string): boolean {
    if (!this.errorHandlingOptions.enableAutoRetry) {
      return false;
    }

    // 可以根据不同操作类型实现不同的重试策略
    switch (operation) {
      case 'tts':
        return this.connectionRetryCount < 2; // TTS重试次数较少
      case 'asr':
        return this.connectionRetryCount < this.errorHandlingOptions.maxRetryAttempts!;
      default:
        return false;
    }
  }

  // 延迟重试
  private async delayedRetry(delay: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, delay);
    });
  }

  // 重试ASR连接
  private async retryASRConnection(): Promise<void> {
    try {
      this.connectionRetryCount = 0;
      await this.connectASR();
      this.dispatchEvent(new CustomEvent('asrConnectionRestored'));
    } catch (error) {
      console.error('ASR connection retry failed:', error);
    }
  }

  // 重试TTS服务
  private async retryTTSService(): Promise<void> {
    try {
      await this.checkTTSAvailability();
      this.fallbackMode = false;
      this.dispatchEvent(new CustomEvent('ttsServiceRestored'));
    } catch (error) {
      console.error('TTS service retry failed:', error);
    }
  }

  // 重试媒体流初始化
  private async retryMediaStreamInitialization(): Promise<void> {
    try {
      await this.initializeMediaStream();
      this.fallbackMode = false;
      this.dispatchEvent(new CustomEvent('mediaStreamRestored'));
    } catch (error) {
      console.error('Media stream retry failed:', error);
    }
  }

  // 获取错误处理器
  getErrorHandler(): ErrorHandler {
    return this.errorHandler;
  }

  // 获取错误统计
  getErrorStats() {
    return this.errorHandler.getErrorStats();
  }

  // 检查是否处于降级模式
  isFallbackMode(): boolean {
    return this.fallbackMode;
  }

  // 检查是否有关键错误
  hasCriticalErrors(): boolean {
    return this.errorHandler.hasCriticalErrors();
  }

  // 清除错误历史
  clearErrorHistory(): void {
    this.errorHandler.clearErrorHistory();
    this.connectionRetryCount = 0;
  }

  // 销毁服务
  destroy(): void {
    this.errorHandler.destroy();
    super.destroy();
  }
}