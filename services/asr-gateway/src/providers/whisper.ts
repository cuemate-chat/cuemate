import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { createWriteStream } from 'fs';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { logger } from '../utils/logger.js';
import { BaseAsrProvider, type AsrProviderConfig, type AsrProviderInfo } from './base.js';

export interface WhisperConfig extends AsrProviderConfig {
  apiKey?: string; // OpenAI API Key for cloud API
  model: string;
  language: string;
  temperature?: number;
  responseFormat?: 'json' | 'text';
  useLocalModel?: boolean; // 是否使用本地模型
  localModelPath?: string; // 本地模型路径
  threads?: number;
  useGpu?: boolean;
}

export class WhisperProvider extends BaseAsrProvider {
  private process: ChildProcessWithoutNullStreams | null = null;
  private audioBuffer: Buffer = Buffer.alloc(0);
  private isProcessing = false;
  private silenceTimeout: NodeJS.Timeout | null = null;
  private tempDir: string;

  constructor(config: WhisperConfig) {
    super(config);
    this.tempDir = join(tmpdir(), `whisper-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`);
  }

  getName(): string {
    return 'openai_whisper';
  }

  getInfo(): AsrProviderInfo {
    return {
      name: 'openai_whisper',
      displayName: 'OpenAI Whisper',
      type: 'both',
      supportsStreamingInput: false, // Whisper主要是批处理
      supportsLanguageDetection: true,
      supportedLanguages: ['zh', 'en', 'es', 'fr', 'de', 'ja', 'ko', 'ru', 'pt', 'it'],
      maxAudioDurationMs: 25 * 60 * 1000, // 25分钟限制（OpenAI API限制）
    };
  }

  async initialize(): Promise<void> {
    const config = this.config as WhisperConfig;
    
    if (!config.useLocalModel) {
      // 使用OpenAI API，需要验证API Key
      this.validateConfig(['apiKey']);
    } else {
      // 使用本地模型，需要验证模型路径
      this.validateConfig(['localModelPath']);
    }

    // 创建临时目录
    try {
      await mkdir(this.tempDir, { recursive: true });
    } catch (error: any) {
      throw new Error(`无法创建临时目录: ${error.message}`);
    }

    this.isInitialized = true;
    logger.info('OpenAI Whisper provider 已初始化');
  }

  async connect(): Promise<void> {
    // Whisper不需要持久连接，直接标记为已连接
    this.emitConnected();
  }

  async sendAudio(audioBuffer: ArrayBuffer | Buffer): Promise<void> {
    // 累积音频缓冲区
    const newBuffer = Buffer.isBuffer(audioBuffer) ? audioBuffer : Buffer.from(audioBuffer);
    this.audioBuffer = Buffer.concat([this.audioBuffer, newBuffer]);

    // 重置静音定时器
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
    }

    // 设置新的静音定时器，在静音后触发处理
    this.silenceTimeout = setTimeout(() => {
      this.transcribeAccumulatedAudio();
    }, 1500); // 1.5秒静音后处理

    // 如果缓冲区超过阈值，立即处理
    if (this.audioBuffer.length > 48000 * 2 * 5) {
      // 5秒音频
      this.transcribeAccumulatedAudio();
    }
  }

  private async transcribeAccumulatedAudio(): Promise<void> {
    if (this.isProcessing || this.audioBuffer.length === 0) {
      return;
    }

    this.isProcessing = true;
    const audioToProcess = this.audioBuffer;
    this.audioBuffer = Buffer.alloc(0);

    try {
      const config = this.config as WhisperConfig;
      
      let result: { text: string; confidence?: number };
      
      if (!config.useLocalModel) {
        // 使用OpenAI API
        result = await this.transcribeWithOpenAI(audioToProcess);
      } else {
        // 使用本地模型
        result = await this.transcribeWithLocalModel(audioToProcess);
      }

      this.emitTranscript({
        text: result.text,
        isFinal: true,
        confidence: result.confidence || 0.9,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      logger.error('Whisper转写失败:', error as any);
      this.emitError(error as Error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async transcribeWithOpenAI(audioBuffer: Buffer): Promise<{ text: string; confidence?: number }> {
    const config = this.config as WhisperConfig;
    
    try {
      // 将音频保存为临时文件
      const tempAudioFile = join(this.tempDir, `audio-${Date.now()}.wav`);
      await writeFile(tempAudioFile, audioBuffer);

      // 调用OpenAI API
      const formData = new FormData();
      const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });
      formData.append('file', audioBlob, 'audio.wav');
      formData.append('model', config.model || 'whisper-1');
      
      if (config.language) {
        formData.append('language', config.language);
      }
      
      if (config.temperature !== undefined) {
        formData.append('temperature', config.temperature.toString());
      }
      
      if (config.responseFormat) {
        formData.append('response_format', config.responseFormat);
      }

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`OpenAI API请求失败: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // 清理临时文件
      try {
        await rm(tempAudioFile);
      } catch (e: any) {
        logger.warn('清理临时文件失败:', e);
      }

      return {
        text: (result as any)?.text || '',
        confidence: 0.95 // OpenAI API不返回置信度，使用固定值
      };
    } catch (error: any) {
      logger.error('OpenAI Whisper转写失败:', error as any);
      throw error;
    }
  }

  private async transcribeWithLocalModel(audioBuffer: Buffer): Promise<{ text: string; confidence?: number }> {
    const config = this.config as WhisperConfig;
    
    return new Promise((resolve, reject) => {
      // 将音频保存为临时文件
      const tempAudioFile = join(this.tempDir, `audio-${Date.now()}.wav`);
      
      const writeStream = createWriteStream(tempAudioFile);
      writeStream.write(audioBuffer);
      writeStream.end();

      writeStream.on('finish', () => {
        // 使用whisper.cpp或其他本地模型
        const whisperProcess = spawn('whisper', [
          '--model', config.localModelPath || './models/whisper',
          '--language', config.language || 'zh',
          '--threads', (config.threads || 4).toString(),
          '--output-format', 'json',
          '--no-timestamps',
          tempAudioFile,
        ]);

        let output = '';
        let errorOutput = '';

        whisperProcess.stdout?.on('data', (data) => {
          output += data.toString();
        });

        whisperProcess.stderr?.on('data', (data) => {
          errorOutput += data.toString();
        });

        whisperProcess.on('close', async (code) => {
          // 清理临时文件
          try {
            await rm(tempAudioFile);
          } catch (e) {
            logger.warn('清理临时文件失败:', e as any);
          }

          if (code === 0) {
            try {
              const result = JSON.parse(output);
              resolve({ 
                text: result.text || output.trim(),
                confidence: 0.9
              });
            } catch (e) {
              // 如果解析JSON失败，直接使用文本输出
              resolve({ 
                text: output.trim(),
                confidence: 0.9
              });
            }
          } else {
            reject(new Error(`Whisper进程退出，代码: ${code}, 错误: ${errorOutput}`));
          }
        });

        whisperProcess.on('error', (error) => {
          reject(new Error(`启动Whisper进程失败: ${error.message}`));
        });
      });

      writeStream.on('error', (error) => {
        reject(new Error(`写入临时文件失败: ${error.message}`));
      });
    });
  }

  async disconnect(): Promise<void> {
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
    }
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    
    // 清理临时目录
    try {
      await rm(this.tempDir, { recursive: true, force: true });
    } catch (e) {
      logger.warn('清理临时目录失败:', e as any);
    }
    
    this.emitDisconnected();
  }

  isAvailable(): boolean {
    const config = this.config as WhisperConfig;
    
    if (!config.useLocalModel) {
      // 使用OpenAI API，检查是否有API Key
      return !!config.apiKey;
    } else {
      // 使用本地模型，检查模型路径
      return !!config.localModelPath;
    }
  }
}
