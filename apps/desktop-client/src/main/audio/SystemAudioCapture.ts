import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('SystemAudioCapture');

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
    log.error('ensureNativeLoaded', '加载音频设备列表模块失败', {}, error);
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
  private silentChunkCount = 0; // 连续静音块计数
  private hasReceivedAudio = false; // 是否收到过有效音频
  private silenceCheckTimer: NodeJS.Timeout | null = null; // 静音检查定时器

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
      log.info('loadAudioTeeModule', '开发环境 AudioTee 路径', { audioTeePath, __dirname, isPackaged });
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
      log.info('loadAudioTeeModule', '生产环境 AudioTee 路径', {
        audioTeePath,
        resourcesPath,
        appPath,
        fileExists: exists,
        isPackaged,
      });

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
      log.info('shouldUseAudioTee', 'AudioTee 模块加载结果', {
        hasModule: !!audioTeeModule,
        hasAudioTee: !!(audioTeeModule && audioTeeModule.AudioTee),
        moduleKeys: audioTeeModule ? Object.keys(audioTeeModule) : [],
      });

      if (audioTeeModule && audioTeeModule.AudioTee) {
        return true;
      }
      log.warn('shouldUseAudioTee', 'AudioTee 模块结构不正确', { audioTeeModule });
      return false;
    } catch (error) {
      log.error('shouldUseAudioTee', 'AudioTee 加载失败', { stack: error instanceof Error ? error.stack : undefined }, error);
      return false;
    }
  }

  /**
   * 开始捕获系统音频扬声器输出
   */
  public async startCapture(): Promise<void> {
    if (this.isCapturing) {
      log.warn('startCapture', '系统音频扬声器捕获已在进行中');
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
    log.debug('startCaptureWithAudioTee', '开始启动 AudioTee 系统音频捕获...');

    // 设置错误回调
    this.onErrorCallback = (error: Error) => {
      log.error('startCaptureWithAudioTee', 'AudioTee 系统音频捕获错误回调', {}, error);
      throw error;
    };

    try {
      // 使用统一的加载方法
      const audioTeeModule = await this.loadAudioTeeModule();
      const AudioTee = audioTeeModule.AudioTee;

      log.debug('startCaptureWithAudioTee', '创建 AudioTee 实例，配置', {
        sampleRate: this.options.sampleRate,
        chunkDurationMs: 200,
        mute: false,
      });

      this.audioTeeCapture = new AudioTee({
        sampleRate: this.options.sampleRate,
        chunkDurationMs: 200, // 每块 200 毫秒
        mute: false,
      });

      log.debug('startCaptureWithAudioTee', 'AudioTee 实例创建完成，开始设置事件监听器');

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

          log.debug('startCaptureWithAudioTee', `AudioTee 音频数据分析: 长度=${audioData.length}bytes, 最大振幅=${maxAmplitude}, 阈值=${threshold}, 有声音=${hasSound}`);

          // 只有包含实际声音时才发送回调
          if (hasSound && this.onDataCallback) {
            log.debug('startCaptureWithAudioTee', 'AudioTee 发送音频数据到回调');
            this.onDataCallback(audioData);
            // 收到有效音频，重置静音计数
            this.silentChunkCount = 0;
            this.hasReceivedAudio = true;
          } else {
            // 连续静音计数
            this.silentChunkCount++;
            log.debug('startCaptureWithAudioTee', `AudioTee 跳过静音数据: 最大振幅=${maxAmplitude} < 阈值=${threshold}, 连续静音块=${this.silentChunkCount}`);
          }
        }
      });

      // 启动静音检测定时器 - 每 5 秒检查一次是否持续静音
      this.startSilenceCheckTimer();

      // 监听开始事件
      this.audioTeeCapture.on('start', () => {
        this.isCapturing = true;
        log.info('startCaptureWithAudioTee', 'AudioTee 开始语音');
      });

      // 监听停止事件
      this.audioTeeCapture.on('stop', () => {
        this.isCapturing = false;
        log.info('startCaptureWithAudioTee', 'AudioTee 停止录制');
      });

      // 监听错误
      this.audioTeeCapture.on('error', (error: Error) => {
        log.error('startCaptureWithAudioTee', 'AudioTee 系统音频捕获错误', {}, error);
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
        log.debug('startCaptureWithAudioTee', `AudioTee [${level}]: ${message.message}`);
      });

      log.debug('startCaptureWithAudioTee', '调用 AudioTee start，配置', {
        sampleRate: this.options.sampleRate,
        chunkDurationMs: 200,
        mute: false,
      });

      // 启动 AudioTee 音频捕获
      log.debug('startCaptureWithAudioTee', '即将调用 AudioTee start()');
      await this.audioTeeCapture.start();
      log.debug('startCaptureWithAudioTee', 'AudioTee start() 调用完成');

      log.info('startCaptureWithAudioTee', 'AudioTee 系统音频捕获已启动');
    } catch (error) {
      log.error('startCaptureWithAudioTee', '启动 AudioTee 系统音频捕获失败', {}, error);
      this.isCapturing = false;
      throw error;
    }
  }

  /**
   * 启动静音检测定时器
   * 每 5 秒检查一次，如果持续 10 秒（50 个 200ms 块）没有收到有效音频，报错
   */
  private startSilenceCheckTimer(): void {
    // 清理之前的定时器
    this.stopSilenceCheckTimer();
    // 重置计数器
    this.silentChunkCount = 0;
    this.hasReceivedAudio = false;

    const SILENCE_CHECK_INTERVAL = 5000; // 5 秒检查一次
    const MAX_SILENT_CHUNKS = 50; // 50 个 200ms 块 = 10 秒持续静音

    this.silenceCheckTimer = setInterval(() => {
      // 如果已经不在捕获状态，停止定时器
      if (!this.isCapturing) {
        this.stopSilenceCheckTimer();
        return;
      }

      // 检查是否持续静音
      if (this.silentChunkCount >= MAX_SILENT_CHUNKS) {
        // 持续 10 秒没有收到有效音频数据
        const errorMsg = this.hasReceivedAudio
          ? 'AudioTee 持续 10 秒未收到有效音频数据，音频源可能已停止'
          : 'AudioTee 启动后 10 秒内未收到任何有效音频数据，可能是系统音频权限未授权或 audiotee 进程无法获取音频';

        log.error('startSilenceCheckTimer', errorMsg, {
          silentChunkCount: this.silentChunkCount,
          hasReceivedAudio: this.hasReceivedAudio,
          isCapturing: this.isCapturing,
        });

        // 触发错误回调
        if (this.onErrorCallback) {
          const error = new Error(errorMsg);
          this.onErrorCallback(error);
        }

        // 重置计数器，避免重复报错
        this.silentChunkCount = 0;
      } else if (this.silentChunkCount > 0) {
        // 有静音但还没达到阈值，记录警告
        log.warn('startSilenceCheckTimer', `AudioTee 检测到连续静音: ${(this.silentChunkCount * 200) / 1000} 秒`, {
          silentChunkCount: this.silentChunkCount,
          hasReceivedAudio: this.hasReceivedAudio,
          secondsOfSilence: (this.silentChunkCount * 200) / 1000,
        });
      }
    }, SILENCE_CHECK_INTERVAL);

    log.info('startSilenceCheckTimer', '静音检测定时器已启动');
  }

  /**
   * 停止静音检测定时器
   */
  private stopSilenceCheckTimer(): void {
    if (this.silenceCheckTimer) {
      clearInterval(this.silenceCheckTimer);
      this.silenceCheckTimer = null;
      log.debug('stopSilenceCheckTimer', '静音检测定时器已停止');
    }
  }

  /**
   * 停止捕获
   */
  public stopCapture(): void {
    if (!this.isCapturing) {
      log.warn('stopCapture', '系统音频扬声器捕获未在进行中');
      return;
    }

    log.info('stopCapture', '停止系统音频扬声器捕获...');

    // 停止静音检测定时器
    this.stopSilenceCheckTimer();

    // 停止 AudioTee 捕获
    if (this.audioTeeCapture) {
      log.info('stopCapture', '停止 AudioTee 捕获...');
      this.audioTeeCapture.stop().catch((error: Error) => {
        log.error('stopCapture', '停止 AudioTee 失败', {}, error);
      });
      this.audioTeeCapture = null;
    }

    // 重置状态
    this.silentChunkCount = 0;
    this.hasReceivedAudio = false;
    this.isCapturing = false;
    log.info('stopCapture', '系统音频扬声器捕获已停止');
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
      log.error('getAudioDevices', '获取音频设备列表失败', {}, error);
      return [
        { id: 'default', name: '默认音频输出设备' },
        { id: 'builtin-speaker', name: '内建扬声器' },
        { id: 'builtin-headphones', name: '内建耳机' },
      ];
    }
  }
}
