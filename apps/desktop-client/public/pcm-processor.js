// PCM 音频处理器 AudioWorklet
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];

    if (input.length > 0) {
      const inputChannel = input[0];

      // 复制输入到输出（透传）
      if (output.length > 0) {
        output[0].set(inputChannel);
      }

      // 收集音频数据到缓冲区
      for (let i = 0; i < inputChannel.length; i++) {
        this.buffer[this.bufferIndex] = inputChannel[i];
        this.bufferIndex++;

        // 当缓冲区满时，发送数据
        if (this.bufferIndex >= this.bufferSize) {
          // 转换为 s16le PCM 格式
          const pcmData = new Int16Array(this.bufferSize);
          let maxValue = 0;
          let nonZeroCount = 0;
          for (let j = 0; j < this.bufferSize; j++) {
            pcmData[j] = Math.max(-32768, Math.min(32767, this.buffer[j] * 32768));
            const absValue = Math.abs(pcmData[j]);
            if (absValue > maxValue) maxValue = absValue;
            if (pcmData[j] !== 0) nonZeroCount++;
          }

          // 调试：检查音频数据质量
          console.log(`PCM数据质量检查: 最大值=${maxValue}, 非零样本=${nonZeroCount}/${this.bufferSize}, 比例=${(nonZeroCount/this.bufferSize*100).toFixed(1)}%`);

          // 发送PCM数据到主线程
          this.port.postMessage({
            type: 'audiodata',
            data: pcmData.buffer
          });

          this.bufferIndex = 0;
        }
      }
    }

    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);