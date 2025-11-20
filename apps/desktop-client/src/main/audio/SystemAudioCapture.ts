import { app } from 'electron';
import * as fs from 'fs';
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
      // 开发环境下，从 dist/main 回到 dist/native/screen_capture_audio/index.node
      nativeModulePath = path.join(__dirname, '../native/screen_capture_audio/index.node');
    } else {
      // 生产环境下，从 app.asar 切换到 app.asar.unpacked
      const basePath = __dirname.replace('app.asar', 'app.asar.unpacked');
      nativeModulePath = path.join(basePath, '../native/screen_capture_audio/index.node');
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
   *
   * 注意：生产环境中，audiotee 二进制文件通过符号链接指向 Resources/bin/audiotee，
   * 这样 audiotee 进程会继承 CueMate.app 的权限，无需用户单独授权
   */
  private async loadAudioTeeModule(): Promise<any> {
    const appPath = app.getAppPath();
    const isPackaged = appPath.includes('app.asar');

    if (!isPackaged) {
      // 开发环境使用相对路径，从 dist/main 回到项目根目录
      const audioTeePath = path.join(
        __dirname,
        '../../../../node_modules/.pnpm/audiotee@0.0.6/node_modules/audiotee/dist/index.js',
      );
      logger.info({ audioTeePath, __dirname, isPackaged }, '开发环境 AudioTee 路径');
      return await import(audioTeePath);
    } else {
      // 生产环境：使用 app.asar.unpacked
      const resourcesPath = path.join(appPath, '..');
      const audioTeePath = path.join(
        resourcesPath,
        'app.asar.unpacked/node_modules/audiotee/dist/index.js',
      );

      // 检查文件是否存在
      const exists = fs.existsSync(audioTeePath);
      logger.info(
        {
          audioTeePath,
          resourcesPath,
          appPath,
          fileExists: exists,
          isPackaged,
        },
        '生产环境 AudioTee 路径',
      );

      if (!exists) {
        throw new Error(`AudioTee 模块文件不存在: ${audioTeePath}`);
      }

      return await import(audioTeePath);
    }
  }

  /**
   * 判断是否应该使用 AudioTee
   */
  private async shouldUseAudioTee(): Promise<boolean> {
    try {
      const audioTeeModule = await this.loadAudioTeeModule();
      logger.info(
        {
          hasModule: !!audioTeeModule,
          hasAudioTee: !!(audioTeeModule && audioTeeModule.AudioTee),
          moduleKeys: audioTeeModule ? Object.keys(audioTeeModule) : [],
        },
        'AudioTee 模块加载结果',
      );

      if (audioTeeModule && audioTeeModule.AudioTee) {
        return true;
      }
      logger.warn({ audioTeeModule }, 'AudioTee 模块结构不正确');
      return false;
    } catch (error) {
      logger.error(
        { err: error, stack: error instanceof Error ? error.stack : undefined },
        'AudioTee 加载失败:',
      );
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
    logger.debug('开始启动 AudioTee 系统音频捕获...');

    // 设置错误回调
    this.onErrorCallback = (error: Error) => {
      logger.error({ err: error }, 'AudioTee 系统音频捕获错误回调:');
      throw error;
    };

    try {
      // 使用统一的加载方法
      const audioTeeModule = await this.loadAudioTeeModule();
      const AudioTee = audioTeeModule.AudioTee;

      logger.debug('创建 AudioTee 实例，配置:', {
        sampleRate: this.options.sampleRate,
        chunkDurationMs: 200,
        mute: false,
      });

      this.audioTeeCapture = new AudioTee({
        sampleRate: this.options.sampleRate,
        chunkDurationMs: 200, // 每块 200 毫秒
        mute: false,
      });

      logger.debug('AudioTee 实例创建完成，开始设置事件监听器');

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

          logger.debug(
            `AudioTee 音频数据分析: 长度=${audioData.length}bytes, 最大振幅=${maxAmplitude}, 阈值=${threshold}, 有声音=${hasSound}`,
          );

          // 只有包含实际声音时才发送回调
          if (hasSound && this.onDataCallback) {
            logger.debug('AudioTee 发送音频数据到回调');
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

      logger.debug(
        '调用 AudioTee start，配置:',
        JSON.stringify({
          sampleRate: this.options.sampleRate,
          chunkDurationMs: 200,
          mute: false,
        }),
      );

      // 启动 AudioTee 音频捕获
      logger.debug('即将调用 AudioTee start()');
      await this.audioTeeCapture.start();
      logger.debug('AudioTee start() 调用完成');

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
      ensureNativeLoaded();

      if (ScreenCaptureAudio && ScreenCaptureAudio.getAudioDevices) {
        const devices = ScreenCaptureAudio.getAudioDevices();
        return devices;
      } else {
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
