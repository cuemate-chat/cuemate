import { StreamingTTS } from '../main/audio/StreamingTTS.js';

/**
 * 面试场景流式TTS使用示例
 */
export function createInterviewTTSExample() {
  // 创建面试优化的TTS实例
  const streamingTTS = StreamingTTS.createForInterview({
    onAudioChunk: (audioBuffer) => {
      console.log(`收到音频块，大小: ${audioBuffer.length} 字节`);
    },
    onComplete: () => {
      console.log('面试官语音播放完成');
    },
    onError: (error) => {
      console.error('TTS错误:', error);
    }
  });

  return {
    /**
     * 模拟AI流式输出面试问题
     */
    simulateInterviewQuestion() {
      console.log('开始模拟面试官提问...');

      // 模拟AI逐步输出文本
      setTimeout(() => streamingTTS.addText('请'), 100);
      setTimeout(() => streamingTTS.addText('介绍'), 200);
      setTimeout(() => streamingTTS.addText('一下'), 300);
      setTimeout(() => streamingTTS.addText('你'), 400);
      setTimeout(() => streamingTTS.addText('自己'), 500);
      setTimeout(() => streamingTTS.addText('。'), 600);

      // 标记流结束
      setTimeout(() => streamingTTS.endStream(), 700);
    },

    /**
     * 模拟AI流式输出长问题
     */
    simulateLongQuestion() {
      console.log('开始模拟长问题...');

      const questionParts = [
        '你能',
        '详细',
        '说说',
        '你在',
        '之前的',
        '工作中',
        '遇到过',
        '什么',
        '挑战，',
        '以及',
        '你是',
        '如何',
        '解决的',
        '吗？'
      ];

      questionParts.forEach((part, index) => {
        setTimeout(() => {
          streamingTTS.addText(part);
          if (index === questionParts.length - 1) {
            streamingTTS.endStream();
          }
        }, (index + 1) * 150);
      });
    },

    /**
     * 停止TTS
     */
    stop() {
      streamingTTS.stop();
    }
  };
}

// 文本分块测试
export function testChineseChunking() {
  const tts = new StreamingTTS({ chunkSize: 3 });

  const testTexts = [
    '你好！', // 应该是一块
    '请介绍一下你自己。', // 应该按句号分割
    '你能详细说说你在之前的工作中遇到过什么挑战吗？', // 较长文本，会被分割
  ];

  testTexts.forEach((text, index) => {
    console.log(`\n测试文本 ${index + 1}: "${text}"`);

    // 使用私有方法进行测试（需要类型断言）
    const chunks = (tts as any).splitTextIntoChunks(text);
    console.log('分块结果:', chunks);
    console.log('块数:', chunks.length);
  });
}