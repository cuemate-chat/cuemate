// 扬声器 PCM 音频处理器 AudioWorklet
class SpeakerPCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // 增加缓冲区大小以积累约 1 秒的音频数据
    // 16000 Hz * 1 秒 = 16000 样本，向上取整到 16384
    this.bufferSize = 16384;
    this.buffer = new Int16Array(this.bufferSize);
    this.bufferIndex = 0;

    // 设置消息处理器
    this.port.onmessage = (event) => {
      if (event.data.type === 'nativeAudioData') {
        this.handleNativeAudioData(event.data.audioData);
      }
    };
  }

  process() {
    // 扬声器测试从主线程接收 AudioTee 音频数据，不需要处理 inputs/outputs
    return true;
  }

  // 接收从主线程发送的 AudioTee 音频数据
  handleNativeAudioData(audioData) {
    const int16Data = new Int16Array(audioData);

    // 将数据添加到缓冲区
    for (let i = 0; i < int16Data.length; i++) {
      this.buffer[this.bufferIndex] = int16Data[i];
      this.bufferIndex++;

      // 当缓冲区满时，发送数据
      if (this.bufferIndex >= this.bufferSize) {
        // 检查音频数据质量
        let maxValue = 0;
        let nonZeroCount = 0;
        for (let j = 0; j < this.bufferSize; j++) {
          const absValue = Math.abs(this.buffer[j]);
          if (absValue > maxValue) maxValue = absValue;
          if (this.buffer[j] !== 0) nonZeroCount++;
        }

        // 只有当有足够的非零样本时才发送（避免发送纯静音）
        const nonZeroRatio = nonZeroCount / this.bufferSize;
        if (nonZeroRatio > 0.01 && maxValue > 100) { // 至少 1%的非零样本且最大值超过阈值
          // 发送 PCM 数据到主线程
          this.port.postMessage({
            type: 'audiodata',
            data: this.buffer.buffer.slice()
          });
        } else {
          console.warn('扬声器测试跳过静音数据');
        }

        this.bufferIndex = 0;
      }
    }
  }
}


registerProcessor('speaker-pcm-processor', SpeakerPCMProcessor);