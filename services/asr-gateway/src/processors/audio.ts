import { EventEmitter } from 'events';

interface AudioConfig {
  sampleRate: number;
  channels: number;
  frameSize: number;
}

export class AudioProcessor extends EventEmitter {
  private config: AudioConfig;
  private buffer: Buffer = Buffer.alloc(0);
  private frameCount = 0;

  constructor(config: AudioConfig) {
    super();
    this.config = config;
  }

  /**
   * 处理输入的音频数据
   */
  processAudioData(data: ArrayBuffer): Buffer {
    const buffer = Buffer.from(data);
    this.buffer = Buffer.concat([this.buffer, buffer]);

    const frames: Buffer[] = [];
    const frameBytes = this.config.frameSize * 2; // 16-bit PCM

    while (this.buffer.length >= frameBytes) {
      const frame = this.buffer.slice(0, frameBytes);
      frames.push(frame);
      this.buffer = this.buffer.slice(frameBytes);
      this.frameCount++;
    }

    if (frames.length > 0) {
      const processedBuffer = Buffer.concat(frames);
      this.emit('frame', processedBuffer, this.frameCount);
      return processedBuffer;
    }

    return Buffer.alloc(0);
  }

  /**
   * 转换采样率
   */
  resample(buffer: Buffer, fromRate: number, toRate: number): Buffer {
    if (fromRate === toRate) {
      return buffer;
    }

    const ratio = toRate / fromRate;
    const newLength = Math.floor(buffer.length * ratio);
    const result = Buffer.alloc(newLength);

    for (let i = 0; i < newLength; i += 2) {
      const sourceIndex = Math.floor(i / ratio);
      if (sourceIndex + 1 < buffer.length) {
        result[i] = buffer[sourceIndex];
        result[i + 1] = buffer[sourceIndex + 1];
      }
    }

    return result;
  }

  /**
   * 应用增益
   */
  applyGain(buffer: Buffer, gain: number): Buffer {
    const result = Buffer.alloc(buffer.length);

    for (let i = 0; i < buffer.length; i += 2) {
      const sample = buffer.readInt16LE(i);
      const amplified = Math.max(-32768, Math.min(32767, sample * gain));
      result.writeInt16LE(amplified, i);
    }

    return result;
  }

  /**
   * 检测静音
   */
  isSilent(buffer: Buffer, threshold: number = 0.01): boolean {
    let sum = 0;
    const sampleCount = buffer.length / 2;

    for (let i = 0; i < buffer.length; i += 2) {
      const sample = Math.abs(buffer.readInt16LE(i) / 32768);
      sum += sample;
    }

    const average = sum / sampleCount;
    return average < threshold;
  }

  /**
   * 计算音频电平 (0-1)
   */
  calculateLevel(buffer: Buffer): number {
    let max = 0;

    for (let i = 0; i < buffer.length; i += 2) {
      const sample = Math.abs(buffer.readInt16LE(i) / 32768);
      if (sample > max) {
        max = sample;
      }
    }

    return max;
  }

  /**
   * 重置处理器
   */
  reset(): void {
    this.buffer = Buffer.alloc(0);
    this.frameCount = 0;
  }

  /**
   * 获取缓冲区大小
   */
  getBufferSize(): number {
    return this.buffer.length;
  }

  /**
   * 获取处理的帧数
   */
  getFrameCount(): number {
    return this.frameCount;
  }
}
