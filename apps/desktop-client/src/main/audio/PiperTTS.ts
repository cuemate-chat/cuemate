import { spawn } from 'child_process';
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
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

export class PiperTTS {
  private pythonPath: string;
  private wrapperScript: string;
  private modelsPath: string;
  private voices: Map<string, PiperVoice> = new Map();

  constructor() {
    // 动态检测Python路径
    this.pythonPath = this.findPythonPath();

    // 开发环境和生产环境的路径处理
    if (!app.isPackaged) {
      this.wrapperScript = path.join(process.cwd(), 'resources', 'piper', 'piper_wrapper.py');
      this.modelsPath = path.join(process.cwd(), 'resources', 'piper');
    } else {
      this.wrapperScript = path.join(
        process.resourcesPath,
        'resources',
        'piper',
        'piper_wrapper.py',
      );
      this.modelsPath = path.join(process.resourcesPath, 'resources', 'piper');
    }

    this.initializeVoices();
  }

  /**
   * 查找可用的Python路径，优先检查piper包是否可用
   */
  private findPythonPath(): string {
    const possiblePaths = [
      // pipx 虚拟环境路径 (最优先)
      path.join(require('os').homedir(), '.local', 'pipx', 'venvs', 'piper-tts', 'bin', 'python'),
      path.join(require('os').homedir(), '.local', 'pipx', 'venvs', 'piper-tts', 'bin', 'python3'),
      // 打包的Python环境 (生产环境)
      ...(app.isPackaged
        ? [
            path.join(process.resourcesPath, 'python', 'bin', 'python'),
            path.join(process.resourcesPath, 'python', 'bin', 'python3'),
          ]
        : []),
      // 全局Python路径
      'python3',
      'python',
      // macOS常见路径
      '/usr/bin/python3',
      '/usr/local/bin/python3',
      // Homebrew路径
      '/opt/homebrew/bin/python3',
    ];

    for (const pythonPath of possiblePaths) {
      try {
        if (fs.existsSync(pythonPath) || pythonPath === 'python' || pythonPath === 'python3') {
          // 验证该Python环境是否有piper包
          if (this.validatePythonEnvironment(pythonPath)) {
            return pythonPath;
          }
        }
      } catch (error) {
        // 忽略错误，继续寻找
      }
    }

    logger.warn('未找到包含piper-tts的Python环境，使用默认python3');
    return 'python3';
  }

  /**
   * 验证Python环境是否包含piper包
   */
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

  /**
   * 初始化可用的语音模型
   */
  private initializeVoices() {
    const voices: PiperVoice[] = [
      // 中文语音
      {
        id: 'zh-CN-female-huayan',
        name: '中文女声（花颜）',
        language: 'zh-CN',
        gender: 'female',
        quality: 'medium',
        modelPath: path.join(this.modelsPath, 'zh_CN-huayan-medium.onnx'),
      },
      // 英文语音
      {
        id: 'en-US-female-amy',
        name: '英文女声（Amy）',
        language: 'en-US',
        gender: 'female',
        quality: 'medium',
        modelPath: path.join(this.modelsPath, 'en_US-amy-medium.onnx'),
      },
    ];

    // 只添加模型文件存在的语音
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

  /**
   * 获取可用的语音列表
   */
  getAvailableVoices(): PiperVoice[] {
    return Array.from(this.voices.values());
  }

  /**
   * 设置用户语言偏好
   */
  static setUserLanguage(locale: 'zh-CN' | 'zh-TW' | 'en-US') {
    try {
      (global as any).userLocale = locale;
    } catch (error) {
      logger.error('设置用户语言偏好失败:', error);
    }
  }

  /**
   * 获取用户的语言偏好（优先 ASR 配置中的 piper_default_language）
   */
  private getUserLanguage(): 'zh-CN' | 'en-US' {
    // 默认使用中文
    let userLanguage: 'zh-CN' | 'en-US' = 'zh-CN';

    try {
      // 优先从全局缓存读取（由 IPC 首次获取时设置）
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
   * 语音合成 - 根据用户语言偏好选择语音模型
   */
  async synthesize(text: string, options: PiperTTSOptions = {}): Promise<Buffer> {
    if (!text.trim()) {
      throw new Error('文本不能为空');
    }

    // 根据用户语言偏好选择语音模型
    const userLanguage = this.getUserLanguage();
    return this.synthesizeSingleLanguage(text, userLanguage, options);
  }

  /**
   * 单一语言语音合成
   */
  private async synthesizeSingleLanguage(
    text: string,
    language: 'zh-CN' | 'en-US',
    options: PiperTTSOptions = {},
  ): Promise<Buffer> {
    // 根据语言选择对应的语音模型
    const availableVoices = Array.from(this.voices.values()).filter((v) => v.language === language);
    if (availableVoices.length === 0) {
      throw new Error(`没有找到${language}语言的语音模型`);
    }

    // 使用第一个匹配的语音模型
    const voiceId = availableVoices[0].id;

    const voice = this.voices.get(voiceId);
    if (!voice) {
      throw new Error(`语音模型不存在: ${voiceId}`);
    }

    return new Promise((resolve, reject) => {
      const args = [
        this.wrapperScript,
        '--model',
        voice.modelPath,
        '--output-raw', // 输出原始PCM数据
        text,
      ];

      // 语速控制
      if (options.speed && options.speed !== 1.0) {
        args.push('--length-scale', (1 / options.speed).toString());
      }

      const piperProcess = spawn(this.pythonPath, args);
      const audioChunks: Buffer[] = [];
      let errorOutput = '';

      // 收集音频数据
      piperProcess.stdout.on('data', (chunk: Buffer) => {
        audioChunks.push(chunk);
      });

      // 收集错误信息
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
        logger.error('Piper TTS 进程错误:', error);
        reject(error);
      });
    });
  }

  /**
   * 将PCM数据转换为WAV格式
   */
  private pcmToWav(pcmData: Buffer, sampleRate: number = 22050): Buffer {
    const wavHeader = Buffer.alloc(44);
    const fileSize = pcmData.length + 44 - 8;

    // WAV 文件头
    wavHeader.write('RIFF', 0);
    wavHeader.writeUInt32LE(fileSize, 4);
    wavHeader.write('WAVE', 8);
    wavHeader.write('fmt ', 12);
    wavHeader.writeUInt32LE(16, 16); // PCM format size
    wavHeader.writeUInt16LE(1, 20); // PCM format
    wavHeader.writeUInt16LE(1, 22); // Mono
    wavHeader.writeUInt32LE(sampleRate, 24); // Sample rate
    wavHeader.writeUInt32LE(sampleRate * 2, 28); // Byte rate
    wavHeader.writeUInt16LE(2, 32); // Block align
    wavHeader.writeUInt16LE(16, 34); // Bits per sample
    wavHeader.write('data', 36);
    wavHeader.writeUInt32LE(pcmData.length, 40);

    return Buffer.concat([wavHeader, pcmData]);
  }

  /**
   * 播放音频到指定设备
   */
  async playToDevice(audioData: Buffer, deviceId?: string): Promise<void> {
    const wavData = this.pcmToWav(audioData);

    // 创建临时文件
    const tempFile = path.join(app.getPath('temp'), `piper_${Date.now()}.wav`);

    try {
      // 写入临时文件
      fs.writeFileSync(tempFile, wavData);

      // 使用系统播放器播放
      const platform = process.platform;
      let playCommand: string;
      let playArgs: string[];

      if (platform === 'darwin') {
        // macOS: 使用 afplay
        playCommand = 'afplay';
        playArgs = [tempFile];

        // 如果指定了设备，尝试使用 -d 参数（需要设备ID）
        if (deviceId && deviceId !== 'default') {
          playArgs.unshift('-d', deviceId);
        }
      } else if (platform === 'win32') {
        // Windows: 使用 powershell 播放
        playCommand = 'powershell';
        playArgs = ['-Command', `(New-Object System.Media.SoundPlayer "${tempFile}").PlaySync()`];
      } else {
        // Linux: 使用 aplay
        playCommand = 'aplay';
        playArgs = [tempFile];

        if (deviceId && deviceId !== 'default') {
          playArgs.unshift('-D', deviceId);
        }
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
      // 清理临时文件
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (error) {
        logger.warn('清理临时音频文件失败:', error);
      }
    }
  }

  /**
   * 便捷的说话方法 - 根据用户语言偏好选择语音模型
   */
  async speak(text: string, options: PiperTTSOptions = {}): Promise<void> {
    if (!text.trim()) {
      throw new Error('文本不能为空');
    }

    // 根据用户语言偏好选择语音模型
    const userLanguage = this.getUserLanguage();

    return this.speakSingleLanguage(text, userLanguage, options);
  }

  /**
   * 单一语言直接播放
   */
  private async speakSingleLanguage(
    text: string,
    language: 'zh-CN' | 'en-US',
    options: PiperTTSOptions = {},
  ): Promise<void> {
    // 选择合适的语音模型
    let voiceId = options.voice;
    if (!voiceId) {
      const availableVoices = Array.from(this.voices.values()).filter(
        (v) => v.language === language,
      );
      voiceId =
        availableVoices.length > 0 ? availableVoices[0].id : Array.from(this.voices.keys())[0];
    }

    const voice = this.voices.get(voiceId);
    if (!voice) {
      throw new Error(`语音模型不存在: ${voiceId}`);
    }

    return new Promise((resolve, reject) => {
      const args = [
        this.wrapperScript,
        '--model',
        voice.modelPath,
        '--play', // 直接播放
        text,
      ];

      // 语速控制
      if (options.speed && options.speed !== 1.0) {
        args.push('--length-scale', (1 / options.speed).toString());
      }

      const piperProcess = spawn(this.pythonPath, args);
      let errorOutput = '';

      // 收集错误信息
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
        logger.error('Piper TTS 进程错误:', error);
        reject(error);
      });
    });
  }

  /**
   * 检查 Piper TTS 是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      return (
        fs.existsSync(this.pythonPath) && fs.existsSync(this.wrapperScript) && this.voices.size > 0
      );
    } catch {
      return false;
    }
  }
}
