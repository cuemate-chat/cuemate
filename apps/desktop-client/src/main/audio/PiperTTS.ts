import { ChildProcess, spawn } from 'child_process';
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { logger } from '../../utils/logger.js';

export interface PiperVoice {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female';
  quality: 'low' | 'medium' | 'high';
  modelPath: string;
}

export interface PiperTTSOptions {
  voice?: string;
  speed?: number; // 0.5-2.0
  outputDevice?: string;
  volume?: number; // 0-1
}

interface PiperResponse {
  status: 'ready' | 'ok' | 'error';
  message?: string;
  audio?: string; // base64 encoded PCM
  sample_rate?: number;
}

/**
 * Piper TTS 服务
 *
 * 设计原则：像 AudioTee 一样，应用启动时初始化，保持进程常驻
 * - 模型只加载一次，后续请求毫秒级响应
 * - 通过 stdin/stdout JSON 协议通信
 * - 应用退出时自动关闭进程
 */
export class PiperTTS {
  // 单例模式：确保全局只有一个 PiperTTS 实例
  private static instance: PiperTTS | null = null;

  /**
   * 获取 PiperTTS 单例实例
   * 全局只有一个实例，服务只启动一次
   */
  static getInstance(): PiperTTS {
    if (!PiperTTS.instance) {
      PiperTTS.instance = new PiperTTS();
    }
    return PiperTTS.instance;
  }

  private pythonPath: string;
  private wrapperScript: string;
  private piperBinaryPath: string | null = null;
  private modelsPath: string;
  private voices: Map<string, PiperVoice> = new Map();

  // 服务模式相关
  private serviceProcess: ChildProcess | null = null;
  private isServiceReady: boolean = false;
  private isServiceStarting: boolean = false;
  private serviceStartPromise: Promise<void> | null = null;
  private pendingRequests: Map<number, { resolve: (value: void) => void; reject: (error: Error) => void }> = new Map();
  private requestId: number = 0;
  private responseReader: readline.Interface | null = null;

  private constructor() {
    this.piperBinaryPath = this.findPiperBinary();

    if (this.piperBinaryPath) {
      logger.info(`使用打包的 Piper 二进制文件: ${this.piperBinaryPath}`);
      this.pythonPath = '';
      this.wrapperScript = '';
    } else {
      logger.info('未找到打包的 Piper 二进制文件，回退到 Python 脚本');
      this.pythonPath = this.findPythonPath();
      if (!app.isPackaged) {
        this.wrapperScript = path.join(process.cwd(), 'resources', 'piper', 'piper_wrapper.py');
      } else {
        this.wrapperScript = path.join(
          process.resourcesPath,
          'resources',
          'piper',
          'piper_wrapper.py',
        );
      }
    }

    if (!app.isPackaged) {
      this.modelsPath = path.join(process.cwd(), 'resources', 'piper');
    } else {
      this.modelsPath = path.join(process.resourcesPath, 'resources', 'piper');
    }

    this.initializeVoices();

    // 应用退出时关闭服务进程
    app.on('before-quit', () => {
      this.stopService();
    });
  }

  private findPiperBinary(): string | null {
    const possiblePaths = [
      ...(app.isPackaged
        ? [path.join(process.resourcesPath, 'resources', 'piper-bin', 'piper')]
        : []),
      path.join(process.cwd(), 'resources', 'piper-bin', 'piper'),
    ];

    for (const binPath of possiblePaths) {
      if (fs.existsSync(binPath)) {
        try {
          fs.chmodSync(binPath, 0o755);
          logger.info(`找到 Piper 二进制文件: ${binPath}`);
          return binPath;
        } catch (error) {
          logger.warn({ err: error }, `设置 Piper 二进制文件权限失败: ${binPath}`);
        }
      }
    }

    return null;
  }

  private findPythonPath(): string {
    const possiblePaths = [
      path.join(require('os').homedir(), '.local', 'pipx', 'venvs', 'piper-tts', 'bin', 'python'),
      path.join(require('os').homedir(), '.local', 'pipx', 'venvs', 'piper-tts', 'bin', 'python3'),
      ...(app.isPackaged
        ? [
            path.join(process.resourcesPath, 'python', 'bin', 'python'),
            path.join(process.resourcesPath, 'python', 'bin', 'python3'),
          ]
        : []),
      'python3',
      'python',
      '/usr/bin/python3',
      '/usr/local/bin/python3',
      '/opt/homebrew/bin/python3',
    ];

    for (const pythonPath of possiblePaths) {
      try {
        if (fs.existsSync(pythonPath) || pythonPath === 'python' || pythonPath === 'python3') {
          if (this.validatePythonEnvironment(pythonPath)) {
            return pythonPath;
          }
        }
      } catch (error) {
        // 忽略错误，继续寻找
      }
    }

    logger.warn('未找到包含 piper-tts 的 Python 环境，使用默认 python3');
    return 'python3';
  }

  private validatePythonEnvironment(pythonPath: string): boolean {
    try {
      const { execSync } = require('child_process');
      execSync(`${pythonPath} -c "from piper import PiperVoice"`, {
        stdio: 'pipe',
        timeout: 5000,
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  private initializeVoices() {
    const voices: PiperVoice[] = [
      {
        id: 'zh-CN-female-huayan',
        name: '中文女声（花颜）',
        language: 'zh-CN',
        gender: 'female',
        quality: 'medium',
        modelPath: path.join(this.modelsPath, 'zh_CN-huayan-medium.onnx'),
      },
      {
        id: 'en-US-female-amy',
        name: '英文女声（Amy）',
        language: 'en-US',
        gender: 'female',
        quality: 'medium',
        modelPath: path.join(this.modelsPath, 'en_US-amy-medium.onnx'),
      },
    ];

    voices.forEach((voice) => {
      if (fs.existsSync(voice.modelPath)) {
        this.voices.set(voice.id, voice);
      } else {
        logger.warn(`Piper 语音模型不存在: ${voice.modelPath}`);
      }
    });

    if (this.voices.size === 0) {
      logger.error('未找到任何 Piper 语音模型');
    }
  }

  getAvailableVoices(): PiperVoice[] {
    return Array.from(this.voices.values());
  }

  static setUserLanguage(locale: 'zh-CN' | 'zh-TW' | 'en-US') {
    try {
      (global as any).userLocale = locale;
    } catch (error) {
      logger.error({ err: error }, '设置用户语言偏好失败:');
    }
  }

  private getUserLanguage(): 'zh-CN' | 'en-US' {
    let userLanguage: 'zh-CN' | 'en-US' = 'zh-CN';

    try {
      const cfg = (global as any).asrConfigCache;
      if (cfg?.piper_default_language === 'en-US') return 'en-US';
      if (cfg?.piper_default_language === 'zh-CN') return 'zh-CN';
    } catch {}

    try {
      const savedLanguage = (global as any).userLocale;
      if (savedLanguage === 'en-US') return 'en-US';
    } catch {}

    return userLanguage;
  }

  /**
   * 启动 Piper TTS 服务进程
   * 应用启动时调用，模型只加载一次
   * 支持并发调用：多个调用者会等待同一个启动 Promise
   */
  async startService(): Promise<void> {
    // 服务已就绪，直接返回
    if (this.isServiceReady) {
      logger.info('Piper TTS 服务已在运行');
      return;
    }

    // 正在启动中，等待现有的启动 Promise
    if (this.isServiceStarting && this.serviceStartPromise) {
      logger.info('Piper TTS 服务正在启动中，等待...');
      return this.serviceStartPromise;
    }

    // 标记为正在启动
    this.isServiceStarting = true;

    const userLanguage = this.getUserLanguage();
    const availableVoices = Array.from(this.voices.values()).filter((v) => v.language === userLanguage);
    if (availableVoices.length === 0) {
      throw new Error(`没有找到${userLanguage}语言的语音模型`);
    }

    const voice = availableVoices[0];

    // 创建启动 Promise 并保存，供并发调用者等待
    this.serviceStartPromise = new Promise<void>((resolve, reject) => {
      let command: string;
      let args: string[];

      if (this.piperBinaryPath) {
        command = this.piperBinaryPath;
        args = ['-m', voice.modelPath, '--service'];
      } else {
        command = this.pythonPath;
        args = [this.wrapperScript, '--model', voice.modelPath, '--service'];
      }

      logger.info(`启动 Piper TTS 服务: ${command} ${args.join(' ')}`);

      this.serviceProcess = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // 读取 stdout（JSON 响应）
      this.responseReader = readline.createInterface({
        input: this.serviceProcess.stdout!,
        crlfDelay: Infinity,
      });

      this.responseReader.on('line', (line: string) => {
        try {
          const response: PiperResponse = JSON.parse(line);

          if (response.status === 'ready') {
            logger.info(`Piper TTS 服务就绪: ${response.message}`);
            this.isServiceReady = true;
            this.isServiceStarting = false;
            resolve();
          } else if (response.status === 'ok' || response.status === 'error') {
            // 处理普通响应（当前实现是串行的，所以直接处理最新的请求）
            const pending = this.pendingRequests.values().next().value;
            if (pending) {
              this.pendingRequests.clear();
              if (response.status === 'ok') {
                pending.resolve();
              } else {
                pending.reject(new Error(response.message || '未知错误'));
              }
            }
          }
        } catch (e) {
          logger.warn(`Piper TTS 服务输出解析失败: ${line}`);
        }
      });

      // 读取 stderr（错误信息）
      this.serviceProcess.stderr?.on('data', (data: Buffer) => {
        logger.warn(`Piper TTS stderr: ${data.toString()}`);
      });

      this.serviceProcess.on('error', (error) => {
        logger.error({ err: error }, 'Piper TTS 服务进程错误');
        this.isServiceReady = false;
        this.isServiceStarting = false;
        reject(error);
      });

      this.serviceProcess.on('close', (code) => {
        logger.info(`Piper TTS 服务进程退出: code=${code}`);
        this.isServiceReady = false;
        this.isServiceStarting = false;
        this.serviceProcess = null;
        this.responseReader = null;
        this.serviceStartPromise = null;
      });

      // 超时处理（模型加载最多等待 60 秒）
      setTimeout(() => {
        if (!this.isServiceReady) {
          this.isServiceStarting = false;
          reject(new Error('Piper TTS 服务启动超时（60秒）'));
        }
      }, 60000);
    });

    return this.serviceStartPromise;
  }

  /**
   * 停止 Piper TTS 服务进程
   */
  stopService(): void {
    if (this.serviceProcess) {
      try {
        // 发送退出命令
        this.serviceProcess.stdin?.write(JSON.stringify({ action: 'quit' }) + '\n');

        // 给进程一点时间优雅退出
        setTimeout(() => {
          if (this.serviceProcess) {
            this.serviceProcess.kill();
          }
        }, 1000);
      } catch (error) {
        logger.warn({ err: error }, 'Piper TTS 服务停止失败');
        this.serviceProcess.kill();
      }

      this.isServiceReady = false;
      this.serviceProcess = null;
      this.responseReader = null;
      logger.info('Piper TTS 服务已停止');
    }
  }

  /**
   * 通过服务模式播放语音
   * 毫秒级响应（模型已预加载）
   */
  private async speakViaService(text: string): Promise<void> {
    if (!this.serviceProcess || !this.isServiceReady) {
      // 自动启动服务
      await this.startService();
    }

    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      this.pendingRequests.set(id, { resolve, reject });

      const request = JSON.stringify({ text, action: 'play' });
      this.serviceProcess!.stdin!.write(request + '\n');

      // 播放超时（单次播放最多 30 秒）
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('TTS 播放超时（30秒）'));
        }
      }, 30000);
    });
  }

  /**
   * 便捷的说话方法 - 使用服务模式
   */
  async speak(text: string, options: PiperTTSOptions = {}): Promise<void> {
    if (!text.trim()) {
      throw new Error('文本不能为空');
    }

    // 优先使用服务模式（毫秒级响应）
    // 如果服务已就绪、正在启动、或进程已存在，都使用服务模式
    if (this.isServiceReady || this.isServiceStarting || this.serviceProcess) {
      return this.speakViaService(text);
    }

    // 回退到单次模式（首次使用时）
    logger.info('Piper TTS 服务未就绪，使用单次模式并启动服务');

    // 异步启动服务（下次使用时就能用服务模式）
    this.startService().catch((err) => {
      logger.error({ err }, 'Piper TTS 服务启动失败');
    });

    // 使用单次模式
    return this.speakSingleMode(text, options);
  }

  /**
   * 单次模式（向后兼容）
   */
  private async speakSingleMode(text: string, options: PiperTTSOptions = {}): Promise<void> {
    const userLanguage = this.getUserLanguage();
    let voiceId = options.voice;

    if (!voiceId) {
      const availableVoices = Array.from(this.voices.values()).filter(
        (v) => v.language === userLanguage,
      );
      voiceId = availableVoices.length > 0 ? availableVoices[0].id : Array.from(this.voices.keys())[0];
    }

    const voice = this.voices.get(voiceId);
    if (!voice) {
      throw new Error(`语音模型不存在: ${voiceId}`);
    }

    return new Promise((resolve, reject) => {
      let command: string;
      let args: string[];

      if (this.piperBinaryPath) {
        command = this.piperBinaryPath;
        args = ['-m', voice.modelPath, '--play', text];
      } else {
        command = this.pythonPath;
        args = [this.wrapperScript, '--model', voice.modelPath, '--play', text];
      }

      if (options.speed && options.speed !== 1.0) {
        args.push('--length-scale', (1 / options.speed).toString());
      }

      const piperProcess = spawn(command, args);
      let errorOutput = '';

      piperProcess.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });

      piperProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          logger.error(`Piper TTS 播放失败: code=${code}, error=${errorOutput}`);
          reject(new Error(`Piper TTS 播放失败: ${errorOutput || `退出码 ${code}`}`));
        }
      });

      piperProcess.on('error', (error) => {
        logger.error({ err: error }, 'Piper TTS 进程错误:');
        reject(error);
      });
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (this.piperBinaryPath) {
        return fs.existsSync(this.piperBinaryPath) && this.voices.size > 0;
      }

      return (
        fs.existsSync(this.pythonPath) && fs.existsSync(this.wrapperScript) && this.voices.size > 0
      );
    } catch {
      return false;
    }
  }

  /**
   * 检查服务是否就绪
   */
  isServiceRunning(): boolean {
    return this.isServiceReady;
  }

  // ============================================
  // 以下是旧的 synthesize/playToDevice 方法（保留向后兼容）
  // ============================================

  async synthesize(text: string, options: PiperTTSOptions = {}): Promise<Buffer> {
    if (!text.trim()) {
      throw new Error('文本不能为空');
    }

    const userLanguage = this.getUserLanguage();
    return this.synthesizeSingleLanguage(text, userLanguage, options);
  }

  private async synthesizeSingleLanguage(
    text: string,
    language: 'zh-CN' | 'en-US',
    options: PiperTTSOptions = {},
  ): Promise<Buffer> {
    const availableVoices = Array.from(this.voices.values()).filter((v) => v.language === language);
    if (availableVoices.length === 0) {
      throw new Error(`没有找到${language}语言的语音模型`);
    }

    const voiceId = availableVoices[0].id;
    const voice = this.voices.get(voiceId);
    if (!voice) {
      throw new Error(`语音模型不存在: ${voiceId}`);
    }

    return new Promise((resolve, reject) => {
      let command: string;
      let args: string[];

      if (this.piperBinaryPath) {
        command = this.piperBinaryPath;
        args = ['-m', voice.modelPath, '--output-raw', text];
      } else {
        command = this.pythonPath;
        args = [this.wrapperScript, '--model', voice.modelPath, '--output-raw', text];
      }

      if (options.speed && options.speed !== 1.0) {
        args.push('--length-scale', (1 / options.speed).toString());
      }

      const piperProcess = spawn(command, args);
      const audioChunks: Buffer[] = [];
      let errorOutput = '';

      piperProcess.stdout.on('data', (chunk: Buffer) => {
        audioChunks.push(chunk);
      });

      piperProcess.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });

      piperProcess.on('close', (code) => {
        if (code === 0) {
          const audioBuffer = Buffer.concat(audioChunks);
          resolve(audioBuffer);
        } else {
          logger.error(`Piper TTS 合成失败: code=${code}, error=${errorOutput}`);
          reject(new Error(`Piper TTS 失败: ${errorOutput || `退出码 ${code}`}`));
        }
      });

      piperProcess.on('error', (error) => {
        logger.error({ err: error }, 'Piper TTS 进程错误:');
        reject(error);
      });
    });
  }

  private pcmToWav(pcmData: Buffer, sampleRate: number = 22050): Buffer {
    const wavHeader = Buffer.alloc(44);
    const fileSize = pcmData.length + 44 - 8;

    wavHeader.write('RIFF', 0);
    wavHeader.writeUInt32LE(fileSize, 4);
    wavHeader.write('WAVE', 8);
    wavHeader.write('fmt ', 12);
    wavHeader.writeUInt32LE(16, 16);
    wavHeader.writeUInt16LE(1, 20);
    wavHeader.writeUInt16LE(1, 22);
    wavHeader.writeUInt32LE(sampleRate, 24);
    wavHeader.writeUInt32LE(sampleRate * 2, 28);
    wavHeader.writeUInt16LE(2, 32);
    wavHeader.writeUInt16LE(16, 34);
    wavHeader.write('data', 36);
    wavHeader.writeUInt32LE(pcmData.length, 40);

    return Buffer.concat([wavHeader, pcmData]);
  }

  async playToDevice(audioData: Buffer, deviceId?: string): Promise<void> {
    const wavData = this.pcmToWav(audioData);
    const tempFile = path.join(app.getPath('temp'), `piper_${Date.now()}.wav`);

    try {
      fs.writeFileSync(tempFile, wavData);

      const platform = process.platform;
      let playCommand: string;
      let playArgs: string[];

      if (platform === 'darwin') {
        playCommand = 'afplay';
        playArgs = [tempFile];

        if (deviceId && deviceId !== 'default') {
          playArgs.unshift('-d', deviceId);
        }
      } else if (platform === 'win32') {
        playCommand = 'powershell';
        playArgs = ['-Command', `(New-Object System.Media.SoundPlayer "${tempFile}").PlaySync()`];
      } else {
        throw new Error(`Unsupported platform: ${platform}`);
      }

      return new Promise((resolve, reject) => {
        const playProcess = spawn(playCommand, playArgs);

        playProcess.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`音频播放失败: 退出码 ${code}`));
          }
        });

        playProcess.on('error', (error) => {
          reject(new Error(`音频播放失败: ${error.message}`));
        });
      });
    } finally {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (error) {
        logger.warn({ err: error }, '清理临时音频文件失败:');
      }
    }
  }
}
