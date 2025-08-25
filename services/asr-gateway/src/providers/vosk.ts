import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger.js';
import { BaseAsrProvider, type AsrProviderConfig, type AsrProviderInfo } from './base.js';

export interface VoskConfig extends AsrProviderConfig {
  model_path: string;
  language: string;
  sample_rate: number;
  max_alternatives?: number;
  words?: boolean;
}

export class VoskProvider extends BaseAsrProvider {
  private process: ChildProcessWithoutNullStreams | null = null;
  private audioBuffer: Buffer = Buffer.alloc(0);
  private isProcessing = false;
  private recognizer: any = null;
  private model: any = null;

  constructor(config: VoskConfig) {
    super(config);
  }

  getName(): string {
    return 'vosk';
  }

  getInfo(): AsrProviderInfo {
    return {
      name: 'vosk',
      displayName: 'Vosk',
      type: 'both',
      supportsStreamingInput: true,
      supportsLanguageDetection: false,
      supportedLanguages: ['zh', 'en', 'es', 'fr', 'de', 'ja', 'ko', 'ru', 'pt', 'it'],
    };
  }

  async initialize(): Promise<void> {
    const config = this.config as VoskConfig;
    this.validateConfig(['model_path']);

    // 检查模型文件是否存在
    if (!existsSync(config.model_path)) {
      throw new Error(`Vosk模型路径不存在: ${config.model_path}`);
    }

    try {
      // 动态导入vosk模块（如果安装了的话）
      const vosk = await import('vosk').catch(() => null);
      
      if (!vosk) {
        throw new Error('Vosk模块未安装');
      }
      
      // 设置日志级别
      vosk.setLogLevel(-1); // 禁用日志输出

      // 加载模型
      this.model = new vosk.Model(config.model_path);
      
      // 创建识别器
      this.recognizer = new vosk.KaldiRecognizer(this.model, config.sample_rate || 16000);
      
      if (config.words) {
        this.recognizer.setWords(true);
      }
      
      if (config.max_alternatives && config.max_alternatives > 1) {
        this.recognizer.setMaxAlternatives(config.max_alternatives);
      }

      this.isInitialized = true;
      logger.info('Vosk provider 已初始化');
    } catch (error) {
      // 如果vosk模块不可用，尝试使用命令行方式
      if (error instanceof Error && error.message.includes('Cannot find module')) {
        logger.info('Vosk模块不可用，将使用命令行方式');
        this.isInitialized = true;
      } else {
        throw new Error(`初始化Vosk失败: ${error}`);
      }
    }
  }

  async connect(): Promise<void> {
    // Vosk不需要网络连接，直接标记为已连接
    this.emitConnected();
  }

  async sendAudio(audioBuffer: ArrayBuffer | Buffer): Promise<void> {
    const buffer = Buffer.isBuffer(audioBuffer) ? audioBuffer : Buffer.from(audioBuffer);
    
    if (this.recognizer) {
      // 使用vosk模块进行实时识别
      this.processWithVoskModule(buffer);
    } else {
      // 累积音频缓冲区，用于命令行方式
      this.audioBuffer = Buffer.concat([this.audioBuffer, buffer]);
      
      // 每当缓冲区足够大时处理一次
      if (this.audioBuffer.length >= 32000) { // 约2秒的16kHz音频
        this.processWithCommandLine();
      }
    }
  }

  private processWithVoskModule(audioBuffer: Buffer): void {
    if (!this.recognizer) return;

    try {
      // 转换为16位PCM数据
      const pcmData = this.convertToPCM16(audioBuffer);
      
      // 处理音频数据
      const result = this.recognizer.acceptWaveform(pcmData);
      
      if (result) {
        // 有最终结果
        const finalResult = JSON.parse(this.recognizer.result());
        if (finalResult.text) {
          this.emitTranscript({
            text: finalResult.text,
            isFinal: true,
            confidence: finalResult.confidence || 0.8,
            timestamp: Date.now(),
            words: finalResult.words
          });
        }
      } else {
        // 部分结果
        const partialResult = JSON.parse(this.recognizer.partialResult());
        if (partialResult.partial) {
          this.emitTranscript({
            text: partialResult.partial,
            isFinal: false,
            confidence: 0.5,
            timestamp: Date.now()
          });
        }
      }
    } catch (error: any) {
      logger.error('Vosk音频处理失败:', error as any);
      this.emitError(new Error(`Vosk音频处理失败: ${error}`));
    }
  }

  private processWithCommandLine(): void {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    const audioToProcess = this.audioBuffer;
    this.audioBuffer = Buffer.alloc(0);

    const config = this.config as VoskConfig;
    
    // 使用命令行方式调用vosk
    const voskProcess = spawn('python3', [
      '-c',
      `
import sys
import json
import wave
import vosk

# 读取模型
model = vosk.Model("${config.model_path}")
rec = vosk.KaldiRecognizer(model, ${config.sample_rate || 16000})

# 从stdin读取音频数据
audio_data = sys.stdin.buffer.read()
result = rec.acceptWaveform(audio_data)
if result:
    print(rec.result())
else:
    print('{"text": "", "confidence": 0}')
      `
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    voskProcess.stdin?.write(audioToProcess);
    voskProcess.stdin?.end();

    let output = '';
    let errorOutput = '';

    voskProcess.stdout?.on('data', (data) => {
      output += data.toString();
    });

    voskProcess.stderr?.on('data', (data) => {
      errorOutput += data.toString();
    });

    voskProcess.on('close', (code) => {
      this.isProcessing = false;
      
      if (code === 0) {
        try {
          const result = JSON.parse(output.trim());
          if (result.text) {
            this.emitTranscript({
              text: result.text,
              isFinal: true,
              confidence: result.confidence || 0.8,
              timestamp: Date.now(),
              words: result.words
            });
          }
        } catch (error: any) {
          logger.error('解析Vosk输出失败:', error as any);
        }
      } else {
        logger.error(`Vosk进程退出，代码: ${code}, 错误: ${errorOutput}`);
        this.emitError(new Error(`Vosk进程失败: ${errorOutput}`));
      }
    });

    voskProcess.on('error', (error: any) => {
      this.isProcessing = false;
      logger.error('启动Vosk进程失败:', error as any);
      this.emitError(new Error(`启动Vosk进程失败: ${error.message}`));
    });
  }

  private convertToPCM16(audioBuffer: Buffer): Buffer {
    // 简单的音频格式转换（假设输入是32位浮点）
    // 实际使用中可能需要更复杂的音频格式处理
    const samples = audioBuffer.length / 4; // 32位 = 4字节
    const pcm16Buffer = Buffer.alloc(samples * 2); // 16位 = 2字节

    for (let i = 0; i < samples; i++) {
      const floatSample = audioBuffer.readFloatLE(i * 4);
      const int16Sample = Math.max(-32768, Math.min(32767, floatSample * 32767));
      pcm16Buffer.writeInt16LE(int16Sample, i * 2);
    }

    return pcm16Buffer;
  }

  async disconnect(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    
    if (this.recognizer) {
      try {
        // 获取最终结果
        const finalResult = JSON.parse(this.recognizer.finalResult());
        if (finalResult.text) {
          this.emitTranscript({
            text: finalResult.text,
            isFinal: true,
            confidence: finalResult.confidence || 0.8,
            timestamp: Date.now(),
            words: finalResult.words
          });
        }
      } catch (error) {
        logger.warn('获取Vosk最终结果失败:', error as any);
      }
      
      this.recognizer = null;
    }
    
    if (this.model) {
      this.model = null;
    }
    
    this.emitDisconnected();
  }

  isAvailable(): boolean {
    const config = this.config as VoskConfig;
    return !!config.model_path && existsSync(config.model_path);
  }

  async healthCheck(): Promise<{
    healthy: boolean;
    message: string;
    details?: any;
  }> {
    const baseCheck = await super.healthCheck();
    
    if (!baseCheck.healthy) {
      return baseCheck;
    }

    const config = this.config as VoskConfig;
    
    // 检查模型文件
    if (!existsSync(config.model_path)) {
      return {
        healthy: false,
        message: `Vosk模型文件不存在: ${config.model_path}`,
        details: { model_path: config.model_path }
      };
    }

    // 检查模型文件夹结构
    const requiredFiles = ['final.mdl', 'HCLG.fst', 'words.txt'];
    const missingFiles = requiredFiles.filter(file => 
      !existsSync(join(config.model_path, file))
    );

    if (missingFiles.length > 0) {
      return {
        healthy: false,
        message: `Vosk模型文件不完整，缺少: ${missingFiles.join(', ')}`,
        details: { missing_files: missingFiles }
      };
    }

    return {
      healthy: true,
      message: 'Vosk运行正常'
    };
  }
}