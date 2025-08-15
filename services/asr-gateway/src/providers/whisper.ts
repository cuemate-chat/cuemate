import { ChildProcessWithoutNullStreams } from 'child_process';
import { EventEmitter } from 'events';
import type { Config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import type { TranscriptResult } from './deepgram.js';

export class WhisperProvider extends EventEmitter {
  private _cfg: Config['whisper']; // 占位，当前未直接使用
  private process: ChildProcessWithoutNullStreams | null = null;
  private audioBuffer: Buffer = Buffer.alloc(0);
  private isProcessing = false;
  private silenceTimeout: NodeJS.Timeout | null = null;

  constructor(config: Config['whisper']) {
    super();
    this._cfg = config;
  }

  async initialize(): Promise<void> {
    // TODO: 检查模型文件是否存在
    // 这里可以使用 whisper.cpp 或 faster-whisper Python 版本
    logger.info('Whisper provider initialized');
    // 引用配置以避免未使用报错
    void this._cfg;
  }

  async processAudio(audioBuffer: ArrayBuffer | Buffer): Promise<void> {
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
    }, 1000); // 1秒静音后处理

    // 如果缓冲区超过阈值，立即处理
    if (this.audioBuffer.length > 48000 * 2 * 3) {
      // 3秒音频
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
      // 使用 whisper.cpp 或 faster-whisper 进行转写
      // 这里是一个简化的示例，实际实现需要根据选择的工具调整

      const result = await this.runWhisperProcess(audioToProcess);

      const transcript: TranscriptResult = {
        text: result.text,
        isFinal: true,
        confidence: result.confidence || 0.9,
        timestamp: Date.now(),
      };

      this.emit('transcript', transcript as any);
    } catch (error) {
      logger.error('Whisper transcription failed:', error as any);
      this.emit('error', error as any);
    } finally {
      this.isProcessing = false;
    }
  }

  private async runWhisperProcess(
    _audioBuffer: Buffer,
  ): Promise<{ text: string; confidence?: number }> {
    return new Promise((resolve) => {
      // 这是一个简化示例，实际实现需要：
      // 1. 将音频写入临时文件
      // 2. 调用 whisper.cpp 或 faster-whisper
      // 3. 解析输出
      // 4. 清理临时文件

      // 模拟转写过程
      setTimeout(() => {
        resolve({
          text: '这是本地 Whisper 转写的示例文本',
          confidence: 0.95,
        });
      }, 200);

      // 实际实现示例（使用 whisper.cpp）：
      /*
      const tempFile = `/tmp/whisper_${Date.now()}.wav`;
      fs.writeFileSync(tempFile, audioBuffer);

      const whisperProcess = spawn('./whisper.cpp/main', [
        '-m', this.config.modelPath,
        '-l', this.config.language,
        '-t', String(this.config.threads),
        '--no-timestamps',
        tempFile,
      ]);

      let output = '';
      whisperProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      whisperProcess.on('close', (code) => {
        fs.unlinkSync(tempFile);
        if (code === 0) {
          resolve({ text: output.trim() });
        } else {
          reject(new Error(`Whisper process exited with code ${code}`));
        }
      });
      */
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
  }

  isAvailable(): boolean {
    // TODO: 检查 whisper 二进制文件和模型是否存在
    return true;
  }
}
