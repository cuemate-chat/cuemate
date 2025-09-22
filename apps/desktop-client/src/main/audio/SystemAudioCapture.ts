import * as fs from 'fs';
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
  private audioChunks: Buffer[] = []; // 用于调试保存音频数据
  private chunkCount = 0;

  constructor(options: SystemAudioCaptureOptions = {}) {
    this.options = {
      sampleRate: options.sampleRate || 16000,
      channels: options.channels || 1,
      bitDepth: options.bitDepth || 16,
      device: options.device || 'default',
    };
  }



  /**
   * 开始捕获系统音频扬声器输出
   */
  public async startCapture(): Promise<void> {
    if (this.isCapturing) {
      logger.warn('系统音频扬声器捕获已在进行中');
      return;
    }

    await this.startCaptureWithCoreAudioTaps();
  }

  /**
   * 使用 Core Audio Taps API 开始捕获
   */
  private async startCaptureWithCoreAudioTaps(): Promise<void> {
    logger.info('开始启动 Core Audio Taps 系统音频捕获...');

    // 设置错误回调
    this.onErrorCallback = (error: Error) => {
      logger.error('Core Audio Taps 系统音频捕获错误回调:', error);
      throw error;
    };

    // 首次使用时再加载原生模块
    if (!ScreenCaptureAudio) {
      ensureNativeLoaded();
    }
    if (!ScreenCaptureAudio) {
      throw new Error('原生音频捕获模块未可用，请确保编译成功');
    }

    // 检查 Core Audio Taps 是否可用
    if (!ScreenCaptureAudio.isCoreAudioTapsAvailable()) {
      throw new Error('Core Audio Taps API 在当前系统上不可用，需要 macOS 14.2+');
    }

    if (!this.nativeCapture) {
      this.nativeCapture = new ScreenCaptureAudio();
    }

    try {

      // 使用原生模块配置 (与 HAL 方式相同的配置)
      const config = {
        sampleRate: this.options.sampleRate,
        channels: this.options.channels,
        onData: (audioData: Buffer) => {
          // 检查音频数据是否包含实际声音（静音检测）
          if (audioData.length > 0) {
            const int16Data = new Int16Array(
              audioData.buffer,
              audioData.byteOffset,
              audioData.length / 2,
            );
            let hasSound = false;
            let maxAmplitude = 0;
            const threshold = 10; // 音频阈值 - 临时降低用于调试

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
              `Core Audio Taps 音频数据分析: 长度=${audioData.length}bytes, 最大振幅=${maxAmplitude}, 阈值=${threshold}, 有声音=${hasSound}`,
            );

            // 收集音频数据用于调试保存（不管是否有声音都保存）
            this.audioChunks.push(Buffer.from(audioData));
            this.chunkCount++;

            // 只有包含实际声音时才发送回调
            if (hasSound && this.onDataCallback) {
              logger.info('Core Audio Taps 发送音频数据到回调');
              this.onDataCallback(audioData);
            } else {
              logger.debug(
                `Core Audio Taps 跳过静音数据: 最大振幅=${maxAmplitude} < 阈值=${threshold}`,
              );
            }
          }
        },
        onError: (error: Error) => {
          logger.error('Core Audio Taps 系统音频捕获错误:', error);
          this.isCapturing = false;

          // 检查是否是权限错误
          if (
            error.message.includes('Permission') ||
            error.message.includes('Access') ||
            error.message.includes('权限')
          ) {
            const permissionError = new Error('Core Audio Taps 访问失败，请检查音频设备权限设置');
            if (this.onErrorCallback) {
              this.onErrorCallback(permissionError);
            }
          } else if (this.onErrorCallback) {
            this.onErrorCallback(error);
          }
        },
      };

      logger.info(
        '调用原生模块 startCapture (Core Audio Taps)，配置:',
        JSON.stringify({
          sampleRate: config.sampleRate,
          channels: config.channels,
          hasOnData: typeof config.onData === 'function',
          hasOnError: typeof config.onError === 'function',
        }),
      );

      // 启动原生音频捕获
      logger.info('即将调用 this.nativeCapture.startCapture (Core Audio Taps)');
      this.nativeCapture.startCapture(config);
      logger.info('this.nativeCapture.startCapture (Core Audio Taps) 调用完成');

      this.isCapturing = true;
      logger.info('Core Audio Taps 系统音频捕获已启动');
    } catch (error) {
      logger.error('启动 Core Audio Taps 系统音频捕获失败:', error);
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

    // 保存剩余的音频数据
    if (this.audioChunks.length > 0) {
      logger.info(`保存剩余的扬声器音频调试文件，块数: ${this.audioChunks.length}`);
      this.saveAudioToFile(this.audioChunks.slice());
      this.audioChunks = [];
      this.chunkCount = 0;
    }

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
   * 保存音频数据到文件用于调试
   */
  private saveAudioToFile(chunks: Buffer[]): void {
    try {
      if (chunks.length === 0) return;

      // 使用相对于项目根目录的路径
      const projectRoot = path.resolve(__dirname, '../../../..');
      const saveDir = path.join(projectRoot, 'private', 'test', 'audio-debug');

      if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir, { recursive: true });
      }

      // 合并所有音频块
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const combinedBuffer = Buffer.alloc(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        chunk.copy(combinedBuffer, offset);
        offset += chunk.length;
      }

      // 生成文件名（带时间戳）
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `speaker-audio-${timestamp}.pcm`;
      const filepath = path.join(saveDir, filename);

      // 保存 PCM 原始数据
      fs.writeFileSync(filepath, combinedBuffer);

      logger.info(
        `扬声器音频数据已保存: ${filename}, 大小: ${combinedBuffer.length} bytes, 块数: ${chunks.length}`,
      );
    } catch (error) {
      logger.error('保存音频文件失败:', error);
    }
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
