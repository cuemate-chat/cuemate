import * as path from 'path';
import { logger } from '../../utils/logger.js';

// 惰性加载原生模块，避免在主进程初始化阶段触发系统框架加载
let ScreenCaptureAudio: any = null;
let nativeTried = false;
function ensureNativeLoaded(): void {
  if (ScreenCaptureAudio || nativeTried) return;
  nativeTried = true;
  try {
    let nativeModulePath: string;
    if (process.env.NODE_ENV === 'development') {
      nativeModulePath = path.join(__dirname, '../../src/main/native/screen_capture_audio');
    } else {
      nativeModulePath = path.join(__dirname, '../native/screen_capture_audio/index.node');
    }

    logger.info(`尝试加载系统音频捕获模块 (Core Audio HAL)：${nativeModulePath}`);
    const fs = require('fs');
    if (!fs.existsSync(nativeModulePath)) {
      throw new Error(`原生模块文件不存在: ${nativeModulePath}`);
    }

    const nativeModule = require(nativeModulePath);
    ScreenCaptureAudio = nativeModule.ScreenCaptureAudio || nativeModule;
    logger.info(
      '原生音频捕获模块加载成功 (使用 Core Audio HAL)',
      JSON.stringify({
        hasScreenCaptureAudio: !!ScreenCaptureAudio,
        moduleKeys: Object.keys(nativeModule),
      }),
    );
  } catch (error) {
    logger.error('加载原生音频捕获模块失败:', error);
  }
}

interface SystemAudioCaptureOptions {
  sampleRate?: number;
  channels?: number;
  bitDepth?: number;
  device?: string; // 音频设备ID
}

export class SystemAudioCapture {
  private nativeCapture: any = null;
  private isCapturing = false;
  private onDataCallback: ((audioData: Buffer) => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;
  private options: Required<SystemAudioCaptureOptions>;

  constructor(options: SystemAudioCaptureOptions = {}) {
    this.options = {
      sampleRate: options.sampleRate || 16000,
      channels: options.channels || 1,
      bitDepth: options.bitDepth || 16,
      device: options.device || 'default',
    };
  }

  /**
   * 开始捕获系统音频扬声器输出 (使用 Core Audio HAL)
   */
  public async startCapture(): Promise<void> {
    if (this.isCapturing) {
      logger.warn('系统音频扬声器捕获已在进行中');
      return;
    }

    // 设置错误回调
    this.onErrorCallback = (error: Error) => {
      logger.error('系统音频扬声器捕获错误回调:', error);
      throw error;
    };

    // 首次使用时再加载原生模块
    if (!ScreenCaptureAudio) {
      ensureNativeLoaded();
    }
    if (!ScreenCaptureAudio) {
      throw new Error('原生音频捕获模块未可用，请确保编译成功');
    }
    if (!this.nativeCapture) {
      this.nativeCapture = new ScreenCaptureAudio();
    }

    try {
      logger.info('开始启动系统音频扬声器捕获 (使用 Core Audio HAL)...');

      // 使用原生模块配置
      const config = {
        sampleRate: this.options.sampleRate,
        channels: this.options.channels,
        onData: (audioData: Buffer) => {
          logger.info(`收到原生音频数据，大小: ${audioData.length} bytes`);
          if (this.onDataCallback) {
            this.onDataCallback(audioData);
          }
        },
        onError: (error: Error) => {
          logger.error('系统音频扬声器捕获错误:', error);
          this.isCapturing = false;

          // 检查是否是权限错误 - Core Audio HAL 通常不需要特殊权限
          if (
            error.message.includes('Permission') ||
            error.message.includes('Access') ||
            error.message.includes('权限')
          ) {
            const permissionError = new Error(
              'Core Audio 访问失败，请检查音频设备权限设置',
            );
            if (this.onErrorCallback) {
              this.onErrorCallback(permissionError);
            }
          } else if (this.onErrorCallback) {
            this.onErrorCallback(error);
          }
        },
      };

      logger.info(
        '调用原生模块 startCapture，配置:',
        JSON.stringify({
          sampleRate: config.sampleRate,
          channels: config.channels,
          hasOnData: typeof config.onData === 'function',
          hasOnError: typeof config.onError === 'function',
        }),
      );

      logger.info(
        '准备调用 this.nativeCapture.startCapture，nativeCapture类型:',
        typeof this.nativeCapture,
      );
      logger.info('startCapture方法类型:', typeof this.nativeCapture.startCapture);

      // 启动原生音频捕获
      logger.info('即将调用 this.nativeCapture.startCapture，参数已准备');
      this.nativeCapture.startCapture(config);
      logger.info('this.nativeCapture.startCapture 调用完成');

      logger.info('已调用 this.nativeCapture.startCapture');
      this.isCapturing = true;

      logger.info('系统音频扬声器捕获已启动 (使用 Core Audio HAL)');
    } catch (error) {
      logger.error('启动系统音频扬声器捕获失败:', error);
      this.isCapturing = false;
      throw error;
    }
  }

  /**
   * 停止捕获
   */
  public stopCapture(): void {
    if (!this.isCapturing) {
      logger.warn('系统音频扬声器捕获未在进行中');
      return;
    }

    logger.info('停止系统音频扬声器捕获...');

    if (this.nativeCapture) {
      this.nativeCapture.stopCapture();
    }

    this.isCapturing = false;
    logger.info('系统音频扬声器捕获已停止');
  }

  /**
   * 设置音频数据回调
   */
  public onData(callback: (audioData: Buffer) => void): void {
    this.onDataCallback = callback;
  }

  /**
   * 设置错误回调
   */
  public onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  /**
   * 检查是否正在捕获
   */
  public isCaptureActive(): boolean {
    return this.isCapturing && this.nativeCapture?.isCapturing();
  }

  /**
   * 获取可用的音频设备列表 (macOS - Core Audio HAL)
   */
  public static async getAudioDevices(): Promise<Array<{ id: string; name: string }>> {
    try {
      if (ScreenCaptureAudio) {
        return ScreenCaptureAudio.getAudioDevices();
      } else {
        logger.warn('原生模块不可用，返回默认设备列表');
        return [{ id: 'default', name: '默认音频输出设备 (Core Audio)' }];
      }
    } catch (error) {
      logger.error('获取音频设备列表失败:', error);
      return [{ id: 'default', name: '默认音频输出设备 (Core Audio)' }];
    }
  }
}
