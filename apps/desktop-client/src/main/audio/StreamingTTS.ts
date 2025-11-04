import { logger } from '../../utils/logger.js';
import { PiperTTS } from './PiperTTS.js';

interface StreamingTTSOptions {
  chunkSize?: number; // 每次处理的文本块大小（字符数）
  bufferSize?: number; // 音频缓冲区大小
  onAudioChunk?: (audioBuffer: Buffer) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export class StreamingTTS {
  private piperTTS: PiperTTS;
  private isPlaying = false;
  private textQueue: string[] = [];
  private audioQueue: Buffer[] = [];
  private currentPlayback: AudioContext | null = null;
  private options: Required<StreamingTTSOptions>;

  constructor(options: StreamingTTSOptions = {}) {
    this.piperTTS = new PiperTTS();
    this.options = {
      chunkSize: options.chunkSize || 5, // 每 5 个中文字符为一块
      bufferSize: options.bufferSize || 2, // 保持 2 个音频块的缓冲
      onAudioChunk: options.onAudioChunk || (() => {}),
      onComplete: options.onComplete || (() => {}),
      onError: options.onError || (() => {}),
    };
  }

  /**
   * 添加流式文本块
   */
  public addText(text: string): void {
    if (!text.trim()) return;

    // 将文本按标点符号分割成合适的语音合成块
    const chunks = this.splitTextIntoChunks(text);
    this.textQueue.push(...chunks);

    if (!this.isPlaying) {
      this.startProcessing();
    }
  }

  /**
   * 标记文本流结束
   */
  public endStream(): void {
    this.textQueue.push('__END_STREAM__');
  }

  /**
   * 停止播放
   */
  public stop(): void {
    this.isPlaying = false;
    this.textQueue = [];
    this.audioQueue = [];

    if (this.currentPlayback) {
      this.currentPlayback.close().catch(() => {});
      this.currentPlayback = null;
    }
  }

  /**
   * 将文本分割成适合 TTS 的块
   * 针对中文优化，优先按标点符号分割，再按字符长度切分
   */
  private splitTextIntoChunks(text: string): string[] {
    const chunks: string[] = [];

    // 首先按句子分割（标点符号）
    const sentences = text.split(/([。！？；,，.!?;])/);

    let currentChunk = '';
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];

      // 如果是标点符号，直接加到当前块
      if (/^[。！？；,，.!?;]$/.test(sentence)) {
        currentChunk += sentence;
        // 遇到句号、问号、感叹号时，立即形成一个块
        if (/^[。！？.!?]$/.test(sentence)) {
          if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
          }
          currentChunk = '';
        }
        continue;
      }

      // 计算中文字符长度（中文算 1 个字符，英文/数字算 0.5 个字符）
      const currentLength = this.getChineseLength(currentChunk);
      const sentenceLength = this.getChineseLength(sentence);

      if (currentLength + sentenceLength > this.options.chunkSize && currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }

    // 处理剩余的文本
    if (currentChunk.trim()) {
      // 如果最后一块太长，按字符强制分割
      const remainingChunks = this.forceChunkByLength(currentChunk);
      chunks.push(...remainingChunks);
    }

    return chunks.filter(chunk => chunk.length > 0);
  }

  /**
   * 计算中文长度（中文字符按 1 计算，英文/数字按 0.5 计算）
   */
  private getChineseLength(text: string): number {
    let length = 0;
    for (const char of text) {
      // 中文字符范围
      if (/[\u4e00-\u9fa5]/.test(char)) {
        length += 1;
      } else {
        length += 0.5;
      }
    }
    return length;
  }

  /**
   * 按长度强制分割文本
   */
  private forceChunkByLength(text: string): string[] {
    const chunks: string[] = [];
    let currentChunk = '';

    for (const char of text) {
      currentChunk += char;
      if (this.getChineseLength(currentChunk) >= this.options.chunkSize) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * 开始处理文本队列
   */
  private async startProcessing(): Promise<void> {
    this.isPlaying = true;

    while (this.isPlaying && this.textQueue.length > 0) {
      const textChunk = this.textQueue.shift();

      if (textChunk === '__END_STREAM__') {
        // 等待所有音频播放完毕
        await this.waitForAudioCompletion();
        this.options.onComplete();
        break;
      }

      if (textChunk) {
        try {
          await this.processTextChunk(textChunk);
        } catch (error) {
          logger.error({ err: error }, '处理文本块失败:');
          this.options.onError(error as Error);
        }
      }

      // 控制处理速度，避免过快消耗队列
      await this.sleep(50);
    }

    this.isPlaying = false;
  }

  /**
   * 处理单个文本块
   */
  private async processTextChunk(text: string): Promise<void> {
    try {
      // 使用 PiperTTS 合成音频
      const audioBuffer = await this.piperTTS.synthesize(text);

      if (audioBuffer) {
        this.audioQueue.push(audioBuffer);
        this.options.onAudioChunk(audioBuffer);

        // 如果音频队列过长，等待播放
        while (this.audioQueue.length > this.options.bufferSize) {
          await this.sleep(100);
        }

        // 立即开始播放第一个音频块
        if (this.audioQueue.length === 1) {
          this.playNextAudioChunk();
        }
      }
    } catch (error) {
      logger.error({ err: error }, '文本转语音失败:');
      throw error;
    }
  }

  /**
   * 播放下一个音频块
   */
  private async playNextAudioChunk(): Promise<void> {
    if (this.audioQueue.length === 0) return;

    const audioBuffer = this.audioQueue.shift();
    if (!audioBuffer) return;

    try {
      await this.playAudioBuffer(audioBuffer);

      // 递归播放下一个音频块
      if (this.audioQueue.length > 0) {
        this.playNextAudioChunk();
      }
    } catch (error) {
      logger.error({ err: error }, '音频播放失败:');
      this.options.onError(error as Error);
    }
  }

  /**
   * 播放音频缓冲区
   */
  private async playAudioBuffer(audioBuffer: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.currentPlayback = new AudioContext({ sampleRate: 16000 });

        // 将 Buffer 转换为 AudioBuffer
        const arrayBuffer: ArrayBuffer = audioBuffer.buffer.slice(
          audioBuffer.byteOffset,
          audioBuffer.byteOffset + audioBuffer.byteLength
        ) as ArrayBuffer;

        this.currentPlayback.decodeAudioData(arrayBuffer)
          .then(decodedAudio => {
            const source = this.currentPlayback!.createBufferSource();
            source.buffer = decodedAudio;
            source.connect(this.currentPlayback!.destination);

            source.onended = () => {
              resolve();
            };

            source.start();
          })
          .catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 等待所有音频播放完毕
   */
  private async waitForAudioCompletion(): Promise<void> {
    while (this.audioQueue.length > 0) {
      await this.sleep(100);
    }
  }

  /**
   * 休眠指定毫秒数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 创建面试场景优化的流式 TTS 实例
   */
  static createForInterview(options: Partial<StreamingTTSOptions> = {}): StreamingTTS {
    return new StreamingTTS({
      chunkSize: 3,  // 面试场景：每 3 个中文字符一块，适合短问题
      bufferSize: 1, // 最小缓冲，降低延迟
      ...options
    });
  }

  /**
   * 创建长文本场景优化的流式 TTS 实例
   */
  static createForLongText(options: Partial<StreamingTTSOptions> = {}): StreamingTTS {
    return new StreamingTTS({
      chunkSize: 8,  // 长文本：每 8 个中文字符一块
      bufferSize: 3, // 较大缓冲，保证连贯性
      ...options
    });
  }
}