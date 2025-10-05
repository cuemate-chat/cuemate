export interface VoiceCoordinatorConfig {
  silenceThreshold: number; // 静音阈值 (毫秒)
  volumeThreshold: number; // 音量阈值 (0-1)
  ttsDelay: number; // TTS结束后延迟启用ASR的时间 (毫秒)
  autoEndTimeout: number; // 自动结束录音超时时间 (毫秒)
}

export interface AudioLevelData {
  volume: number;
  timestamp: number;
}

export enum VoiceState {
  IDLE = 'idle', // 空闲状态
  TTS_PLAYING = 'tts_playing', // TTS正在播放
  ASR_LISTENING = 'asr_listening', // ASR正在监听
  USER_SPEAKING = 'user_speaking', // 用户正在说话
  PROCESSING = 'processing', // 处理中
}

export class VoiceCoordinator extends EventTarget {
  private currentState: VoiceState = VoiceState.IDLE;
  private config: VoiceCoordinatorConfig;
  private lastSpeechTime: number = 0;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private autoEndTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<VoiceCoordinatorConfig> = {}) {
    super();

    this.config = {
      silenceThreshold: 3000, // 3秒静音
      volumeThreshold: 0.01, // 音量阈值
      ttsDelay: 500, // TTS结束后500ms再启用ASR
      autoEndTimeout: 5000, // 5秒自动结束
      ...config,
    };
  }

  // 初始化音频系统
  async initialize(): Promise<void> {
    try {
      // 获取麦克风权限
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true, // 启用回声消除
          noiseSuppression: true, // 启用噪音抑制
          autoGainControl: true, // 启用自动增益控制
        },
      });

      // 创建音频上下文
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // 创建分析器
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.minDecibels = -90;
      this.analyser.maxDecibels = -10;
      this.analyser.smoothingTimeConstant = 0.85;

      // 连接音频节点
      source.connect(this.analyser);

      // 开始音频级别监测
      this.startAudioMonitoring();

      this.dispatchEvent(new CustomEvent('initialized'));
    } catch (error) {
      console.error('Failed to initialize VoiceCoordinator:', error);
      this.dispatchEvent(new CustomEvent('error', { detail: error }));
      throw error;
    }
  }

  // 开始TTS播放
  startTTS(): void {
    if (this.currentState === VoiceState.TTS_PLAYING) {
      console.warn('TTS is already playing');
      return;
    }

    this.currentState = VoiceState.TTS_PLAYING;
    this.stopASRListening();
    this.clearAutoEndTimer();

    this.dispatchEvent(new CustomEvent('stateChanged', { detail: this.currentState }));
  }

  // TTS播放完成
  onTTSComplete(): void {
    if (this.currentState !== VoiceState.TTS_PLAYING) {
      console.warn('TTS complete but not in TTS_PLAYING state');
      return;
    }

    this.currentState = VoiceState.PROCESSING;

    // 延迟启用ASR，避免TTS尾音干扰
    setTimeout(() => {
      if (this.currentState === VoiceState.PROCESSING) {
        this.startASRListening();
      }
    }, this.config.ttsDelay);

    this.dispatchEvent(new CustomEvent('stateChanged', { detail: this.currentState }));
  }

  // 开始ASR监听
  startASRListening(): void {
    if (this.currentState === VoiceState.ASR_LISTENING) {
      console.warn('ASR is already listening');
      return;
    }

    this.currentState = VoiceState.ASR_LISTENING;
    this.lastSpeechTime = 0;
    this.startAutoEndTimer();

    this.dispatchEvent(new CustomEvent('asrStarted'));
    this.dispatchEvent(new CustomEvent('stateChanged', { detail: this.currentState }));
    console.log('ASR listening started');
  }

  // 停止ASR监听
  stopASRListening(): void {
    if (
      this.currentState === VoiceState.ASR_LISTENING ||
      this.currentState === VoiceState.USER_SPEAKING
    ) {
      this.currentState = VoiceState.IDLE;
      this.clearAutoEndTimer();

      this.dispatchEvent(new CustomEvent('asrStopped'));
      this.dispatchEvent(new CustomEvent('stateChanged', { detail: this.currentState }));
      console.log('ASR listening stopped');
    }
  }

  // 手动结束用户说话
  manualEndSpeaking(): void {
    if (this.currentState === VoiceState.USER_SPEAKING) {
      this.currentState = VoiceState.PROCESSING;
      this.clearAutoEndTimer();

      this.dispatchEvent(new CustomEvent('userFinishedSpeaking', { detail: { manual: true } }));
      this.dispatchEvent(new CustomEvent('stateChanged', { detail: this.currentState }));
      console.log('User speaking ended manually');
    }
  }

  // 重置到空闲状态
  reset(): void {
    this.currentState = VoiceState.IDLE;
    this.lastSpeechTime = 0;
    this.clearAutoEndTimer();

    this.dispatchEvent(new CustomEvent('stateChanged', { detail: this.currentState }));
    console.log('VoiceCoordinator reset to idle');
  }

  // 开始音频级别监测
  private startAudioMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      if (!this.analyser) return;

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(dataArray);

      // 计算音量级别
      const volume = this.calculateVolumeLevel(dataArray);
      const timestamp = Date.now();

      // 发送音频级别数据
      this.dispatchEvent(new CustomEvent('audioLevel', { detail: { volume, timestamp } }));

      // 处理语音活动检测
      this.handleVoiceActivity(volume, timestamp);
    }, 100); // 每100ms检测一次
  }

  // 计算音量级别
  private calculateVolumeLevel(dataArray: Uint8Array): number {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    return sum / dataArray.length / 255; // 标准化到0-1
  }

  // 处理语音活动检测
  private handleVoiceActivity(volume: number, timestamp: number): void {
    const isSpeaking = volume > this.config.volumeThreshold;

    if (this.currentState === VoiceState.ASR_LISTENING) {
      if (isSpeaking) {
        // 检测到用户开始说话
        this.currentState = VoiceState.USER_SPEAKING;
        this.lastSpeechTime = timestamp;
        this.clearAutoEndTimer();

        this.dispatchEvent(new CustomEvent('userStartedSpeaking'));
        this.dispatchEvent(new CustomEvent('stateChanged', { detail: this.currentState }));
        console.log('User started speaking');
      }
    } else if (this.currentState === VoiceState.USER_SPEAKING) {
      if (isSpeaking) {
        // 更新最后说话时间
        this.lastSpeechTime = timestamp;
      } else {
        // 检查是否静音时间足够长
        const silenceDuration = timestamp - this.lastSpeechTime;
        if (silenceDuration >= this.config.silenceThreshold) {
          // 自动结束说话
          this.currentState = VoiceState.PROCESSING;
          this.dispatchEvent(
            new CustomEvent('userFinishedSpeaking', { detail: { manual: false, silenceDuration } }),
          );
          this.dispatchEvent(new CustomEvent('stateChanged', { detail: this.currentState }));
          console.log(
            'User finished speaking (auto detected after',
            silenceDuration,
            'ms silence)',
          );
        }
      }
    }
  }

  // 开始自动结束计时器
  private startAutoEndTimer(): void {
    this.clearAutoEndTimer();

    this.autoEndTimer = setTimeout(() => {
      if (this.currentState === VoiceState.ASR_LISTENING) {
        // 监听超时，没有检测到用户说话
        this.dispatchEvent(new CustomEvent('listeningTimeout'));
        console.log('ASR listening timeout');
      }
    }, this.config.autoEndTimeout);
  }

  // 清除自动结束计时器
  private clearAutoEndTimer(): void {
    if (this.autoEndTimer) {
      clearTimeout(this.autoEndTimer);
      this.autoEndTimer = null;
    }
  }

  // 获取当前状态
  getState(): VoiceState {
    return this.currentState;
  }

  // 获取配置
  getConfig(): VoiceCoordinatorConfig {
    return { ...this.config };
  }

  // 更新配置
  updateConfig(newConfig: Partial<VoiceCoordinatorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.dispatchEvent(new CustomEvent('configUpdated', { detail: this.config }));
  }

  // 检查是否可以开始ASR
  canStartASR(): boolean {
    return this.currentState === VoiceState.IDLE || this.currentState === VoiceState.PROCESSING;
  }

  // 检查是否可以开始TTS
  canStartTTS(): boolean {
    return this.currentState !== VoiceState.TTS_PLAYING;
  }

  // 获取状态描述
  getStateDescription(): string {
    const descriptions: Record<VoiceState, string> = {
      [VoiceState.IDLE]: '空闲',
      [VoiceState.TTS_PLAYING]: 'AI正在说话',
      [VoiceState.ASR_LISTENING]: '等待您说话',
      [VoiceState.USER_SPEAKING]: '正在录制',
      [VoiceState.PROCESSING]: '处理中',
    };
    return descriptions[this.currentState] || this.currentState;
  }

  // 销毁资源
  destroy(): void {
    // 清除定时器
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.clearAutoEndTimer();

    // 关闭音频资源
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    // EventTarget没有removeAllListeners方法，需要手动管理监听器
  }
}
