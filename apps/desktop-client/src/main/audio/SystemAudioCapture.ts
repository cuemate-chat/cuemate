import * as path from 'path';
import { logger } from '../../utils/logger.js';

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
      const basePath = __dirname.replace('app.asar', 'app.asar.unpacked');
      nativeModulePath = path.join(basePath, '../native/screen_capture_audio/index.node');
    }

    const fs = require('fs');
    if (!fs.existsSync(nativeModulePath)) {
      throw new Error(`原生模块文件不存在: ${nativeModulePath}`);
    }

    const nativeModule = require(nativeModulePath);
    ScreenCaptureAudio = nativeModule.ScreenCaptureAudio || nativeModule;
  } catch (error) {
    logger.error({ err: error }, '加载音频设备列表模块失败:');
  }
}

interface SystemAudioCaptureOptions {
  sampleRate?: number;
  channels?: number;
  bitDepth?: number;
  device?: string; // 用户选择的设备（用于界面显示，实际捕获仍是系统音频）
}

export class SystemAudioCapture {
  private audioTeeCapture: any = null; // AudioTee 实例
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
   * 加载 AudioTee 模块
   */
  private async loadAudioTeeModule(): Promise<any> {
    if (process.env.NODE_ENV === 'development') {
      // 开发环境使用相对路径，从 dist/main 回到项目根目录
      const audioTeePath = path.join(
        __dirname,
        '../../../../node_modules/.pnpm/audiotee@0.0.6/node_modules/audiotee/dist/index.js',
      );
      return await import(audioTeePath);
    } else {
      // 生产环境使用动态 import
      return await import('audiotee');
    }
  }

  /**
   * 判断是否应该使用 AudioTee
   */
  private async shouldUseAudioTee(): Promise<boolean> {
    try {
      const audioTeeModule = await this.loadAudioTeeModule();
      if (audioTeeModule && audioTeeModule.AudioTee) {
        return true;
      }
      return false;
    } catch (error) {
      logger.error({ err: error }, 'AudioTee 不可用:');
      return false;
    }
  }

  /**
   * 开始捕获系统音频扬声器输出
   */
  public async startCapture(): Promise<void> {
    if (this.isCapturing) {
      logger.warn('系统音频扬声器捕获已在进行中');
      return;
    }

    // 使用 AudioTee 进行系统音频捕获
    const canUseAudioTee = await this.shouldUseAudioTee();
    if (canUseAudioTee) {
      await this.startCaptureWithAudioTee();
    } else {
      throw new Error('AudioTee 不可用，无法进行系统音频捕获');
    }
  }

  /**
   * 使用 AudioTee 开始捕获
   */
  private async startCaptureWithAudioTee(): Promise<void> {
    logger.info('开始启动 AudioTee 系统音频捕获...');

    // 设置错误回调
    this.onErrorCallback = (error: Error) => {
      logger.error({ err: error }, 'AudioTee 系统音频捕获错误回调:');
      throw error;
    };

    try {
      // 使用统一的加载方法
      const audioTeeModule = await this.loadAudioTeeModule();
      const AudioTee = audioTeeModule.AudioTee;

      this.audioTeeCapture = new AudioTee({
        sampleRate: this.options.sampleRate,
        chunkDurationMs: 200, // 每块 200 毫秒
        mute: false,
      });

      // 监听音频数据
      this.audioTeeCapture.on('data', (chunk: { data: Buffer }) => {
        const audioData = chunk.data;

        // 检查音频数据是否包含实际声音（静音检测）
        if (audioData.length > 0) {
          const int16Data = new Int16Array(
            audioData.buffer,
            audioData.byteOffset,
            audioData.length / 2,
          );
          let hasSound = false;
          let maxAmplitude = 0;
          const threshold = 10; // 音频阈值

          for (let i = 0; i < int16Data.length; i++) {
            const amplitude = Math.abs(int16Data[i]);
            if (amplitude > maxAmplitude) {
              maxAmplitude = amplitude;
            }
            if (amplitude > threshold) {
              hasSound = true;
              break;
            }
          }

          logger.info(
            `AudioTee 音频数据分析: 长度=${audioData.length}bytes, 最大振幅=${maxAmplitude}, 阈值=${threshold}, 有声音=${hasSound}`,
          );

          // 只有包含实际声音时才发送回调
          if (hasSound && this.onDataCallback) {
            logger.info('AudioTee 发送音频数据到回调');
            this.onDataCallback(audioData);
          } else {
            logger.debug(`AudioTee 跳过静音数据: 最大振幅=${maxAmplitude} < 阈值=${threshold}`);
          }
        }
      });

      // 监听开始事件
      this.audioTeeCapture.on('start', () => {
        this.isCapturing = true;
        logger.info('AudioTee 开始语音');
      });

      // 监听停止事件
      this.audioTeeCapture.on('stop', () => {
        this.isCapturing = false;
        logger.info('AudioTee 停止录制');
      });

      // 监听错误
      this.audioTeeCapture.on('error', (error: Error) => {
        logger.error({ err: error }, 'AudioTee 系统音频捕获错误:');
        this.isCapturing = false;

        // 检查是否是权限错误
        if (
          error.message.includes('Permission') ||
          error.message.includes('Access') ||
          error.message.includes('权限')
        ) {
          const permissionError = new Error('AudioTee 访问失败，请检查音频设备权限设置');
          if (this.onErrorCallback) {
            this.onErrorCallback(permissionError);
          }
        } else if (this.onErrorCallback) {
          this.onErrorCallback(error);
        }
      });

      // 监听日志
      this.audioTeeCapture.on('log', (level: string, message: any) => {
        logger.debug(`AudioTee [${level}]: ${message.message}`);
      });

      logger.info(
        '调用 AudioTee start，配置:',
        JSON.stringify({
          sampleRate: this.options.sampleRate,
          chunkDurationMs: 200,
          mute: false,
        }),
      );

      // 启动 AudioTee 音频捕获
      logger.info('即将调用 AudioTee start()');
      await this.audioTeeCapture.start();
      logger.info('AudioTee start() 调用完成');

      logger.info('AudioTee 系统音频捕获已启动');
    } catch (error) {
      logger.error({ err: error }, '启动 AudioTee 系统音频捕获失败:');
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

    // 停止 AudioTee 捕获
    if (this.audioTeeCapture) {
      logger.info('停止 AudioTee 捕获...');
      this.audioTeeCapture.stop().catch((error: Error) => {
        logger.error({ err: error }, '停止 AudioTee 失败:');
      });
      this.audioTeeCapture = null;
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
    return this.isCapturing && this.audioTeeCapture !== null;
  }

  /**
   * 获取可用的音频设备列表
   */
  public static async getAudioDevices(): Promise<Array<{ id: string; name: string }>> {
    try {
      // 确保原生模块已加载
      ensureNativeLoaded();

      if (ScreenCaptureAudio && ScreenCaptureAudio.getAudioDevices) {
        const devices = ScreenCaptureAudio.getAudioDevices();
        logger.info(`获取到 ${devices.length} 个音频设备`);
        return devices;
      } else {
        logger.warn('原生模块不可用，返回默认设备列表');
        return [
          { id: 'default', name: '默认音频输出设备' },
          { id: 'builtin-speaker', name: '内建扬声器' },
          { id: 'builtin-headphones', name: '内建耳机' },
        ];
      }
    } catch (error) {
      logger.error({ err: error }, '获取音频设备列表失败:');
      return [
        { id: 'default', name: '默认音频输出设备' },
        { id: 'builtin-speaker', name: '内建扬声器' },
        { id: 'builtin-headphones', name: '内建耳机' },
      ];
    }
  }
}
