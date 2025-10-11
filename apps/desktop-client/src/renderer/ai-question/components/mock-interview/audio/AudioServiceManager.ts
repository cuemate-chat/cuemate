/**
 * 音频服务管理器
 * 统一管理ASR、TTS和音频录制功能
 */

import { VoiceCoordinator, VoiceState, AudioLevelData } from '../voice/VoiceCoordinator';

export interface ASRConfig {
  serverUrl: string;
  hotwordsPath?: string;
  enableHotwords?: boolean;
  language?: string;
  sampleRate?: number;
}

export interface TTSConfig {
  language: string;
  voiceModel: string;
  speed?: number;
  volume?: number;
}

export interface AudioConfig {
  microphoneDeviceId?: string;
  speakerDeviceId?: string;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}

export interface ASRResult {
  text: string;
  confidence: number;
  isFinal: boolean;
  timestamp: number;
}

export interface TTSResult {
  audioUrl: string;
  duration: number;
  text: string;
}

export class AudioServiceManager extends EventTarget {
  private voiceCoordinator: VoiceCoordinator;
  protected asrConfig: ASRConfig;
  protected ttsConfig: TTSConfig;
  protected audioConfig: AudioConfig;
  private currentRecording: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private asrWebSocket: WebSocket | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private isInitialized = false;

  constructor(
    asrConfig: ASRConfig,
    ttsConfig: TTSConfig,
    audioConfig: AudioConfig = {}
  ) {
    super();
    this.asrConfig = asrConfig;
    this.ttsConfig = ttsConfig;
    this.audioConfig = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      ...audioConfig
    };
    this.voiceCoordinator = new VoiceCoordinator();
    this.setupVoiceCoordinatorEvents();
  }

  // 初始化音频服务
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 初始化语音协调器
      await this.voiceCoordinator.initialize();

      // 初始化媒体流
      await this.initializeMediaStream();

      // 连接ASR服务
      await this.connectASR();

      // 检查TTS可用性
      await this.checkTTSAvailability();

      this.isInitialized = true;
      this.dispatchEvent(new CustomEvent('initialized'));
      console.debug('Audio Service Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Audio Service Manager:', error);
      this.dispatchEvent(new CustomEvent('error', { detail: error }));
      throw error;
    }
  }

  // 检查TTS可用性
  protected async checkTTSAvailability(): Promise<void> {
    try {
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI?.tts?.isAvailable) {
        console.warn('TTS API not available');
        return;
      }

      const result = await electronAPI.tts.isAvailable();
      if (result.success && result.available) {
        console.debug('TTS service is available');
        this.dispatchEvent(new CustomEvent('ttsAvailable'));
      } else {
        console.warn('TTS service is not available');
        this.dispatchEvent(new CustomEvent('ttsUnavailable'));
      }
    } catch (error) {
      console.error('Failed to check TTS availability:', error);
      this.dispatchEvent(new CustomEvent('ttsUnavailable'));
    }
  }

  // 设置语音协调器事件监听
  private setupVoiceCoordinatorEvents(): void {
    this.voiceCoordinator.addEventListener('stateChanged', ((event: CustomEvent) => {
      const state = event.detail as VoiceState;
      this.handleVoiceStateChange(state);
    }) as EventListener);

    this.voiceCoordinator.addEventListener('audioLevel', ((event: CustomEvent) => {
      const data = event.detail as AudioLevelData;
      this.dispatchEvent(new CustomEvent('audioLevel', { detail: data }));
    }) as EventListener);

    this.voiceCoordinator.addEventListener('userStartedSpeaking', () => {
      this.startASRRecording();
    });

    this.voiceCoordinator.addEventListener('userFinishedSpeaking', ((event: CustomEvent) => {
      this.stopASRRecording();
      this.dispatchEvent(new CustomEvent('speechEnded', { detail: event.detail }));
    }) as EventListener);
  }

  // 处理语音状态变化
  private handleVoiceStateChange(state: VoiceState): void {
    this.dispatchEvent(new CustomEvent('voiceStateChanged', { detail: state }));

    switch (state) {
      case VoiceState.TTS_PLAYING:
        this.pauseASR();
        break;
      case VoiceState.ASR_LISTENING:
        this.resumeASR();
        break;
      case VoiceState.IDLE:
        this.stopAllAudio();
        break;
    }
  }

  // 初始化媒体流
  protected async initializeMediaStream(): Promise<void> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: this.audioConfig.microphoneDeviceId,
          echoCancellation: this.audioConfig.echoCancellation,
          noiseSuppression: this.audioConfig.noiseSuppression,
          autoGainControl: this.audioConfig.autoGainControl,
          sampleRate: this.asrConfig.sampleRate || 16000,
          channelCount: 1
        }
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.debug('Media stream initialized successfully');
    } catch (error) {
      console.error('Failed to initialize media stream:', error);
      throw new Error('无法访问麦克风，请检查权限设置');
    }
  }

  // 连接ASR服务
  protected async connectASR(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.asrWebSocket = new WebSocket(this.asrConfig.serverUrl);

        this.asrWebSocket.onopen = () => {
          console.debug('ASR WebSocket connected');
          this.sendASRConfig();
          resolve();
        };

        this.asrWebSocket.onmessage = (event) => {
          this.handleASRMessage(event);
        };

        this.asrWebSocket.onerror = (error) => {
          console.error('ASR WebSocket error:', error);
          reject(new Error('ASR连接失败'));
        };

        this.asrWebSocket.onclose = () => {
          console.debug('ASR WebSocket closed');
          this.dispatchEvent(new CustomEvent('asrDisconnected'));
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  // 发送ASR配置
  private sendASRConfig(): void {
    if (!this.asrWebSocket || this.asrWebSocket.readyState !== WebSocket.OPEN) return;

    const config = {
      mode: 'offline',
      chunk_size: [5, 10, 5],
      chunk_interval: 10,
      wav_name: 'microphone',
      hotwords: this.asrConfig.hotwordsPath || '',
      ...this.asrConfig
    };

    this.asrWebSocket.send(JSON.stringify(config));
  }

  // 处理ASR消息
  private handleASRMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);

      if (data.mode === 'offline') {
        const result: ASRResult = {
          text: data.text || '',
          confidence: data.confidence || 0,
          isFinal: data.is_final || false,
          timestamp: Date.now()
        };

        this.dispatchEvent(new CustomEvent('asrResult', { detail: result }));

        if (result.isFinal && result.text.trim()) {
          this.dispatchEvent(new CustomEvent('speechRecognized', { detail: result }));
        }
      }
    } catch (error) {
      console.error('Failed to parse ASR message:', error);
    }
  }

  // 开始ASR录音
  private startASRRecording(): void {
    if (!this.mediaStream || !this.asrWebSocket ||
        this.asrWebSocket.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      this.currentRecording = new MediaRecorder(this.mediaStream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.currentRecording.ondataavailable = (event) => {
        if (event.data.size > 0 && this.asrWebSocket?.readyState === WebSocket.OPEN) {
          // 转换为ASR所需的格式并发送
          this.sendAudioToASR(event.data);
        }
      };

      this.currentRecording.start(100); // 每100ms发送一次数据
      this.dispatchEvent(new CustomEvent('recordingStarted'));
    } catch (error) {
      console.error('Failed to start ASR recording:', error);
    }
  }

  // 停止ASR录音
  private stopASRRecording(): void {
    if (this.currentRecording && this.currentRecording.state === 'recording') {
      this.currentRecording.stop();
      this.currentRecording = null;
      this.dispatchEvent(new CustomEvent('recordingStopped'));
    }
  }

  // 发送音频数据到ASR
  private async sendAudioToASR(audioData: Blob): Promise<void> {
    if (!this.asrWebSocket || this.asrWebSocket.readyState !== WebSocket.OPEN) return;

    try {
      const arrayBuffer = await audioData.arrayBuffer();
      this.asrWebSocket.send(arrayBuffer);
    } catch (error) {
      console.error('Failed to send audio to ASR:', error);
    }
  }

  // TTS播放
  async playTTS(text: string): Promise<TTSResult> {
    return new Promise(async (resolve, reject) => {
      try {
        // 通知语音协调器开始TTS
        this.voiceCoordinator.startTTS();

        // 检查是否使用直接播放模式
        if (this.shouldUseDirectPlay()) {
          await this.playTTSDirectly(text, resolve, reject);
        } else {
          await this.playTTSWithBlob(text, resolve, reject);
        }
      } catch (error) {
        this.voiceCoordinator.onTTSComplete();
        reject(error);
      }
    });
  }

  // 检查是否应该使用直接播放模式
  private shouldUseDirectPlay(): boolean {
    // 如果配置了直接播放模式，使用PiperTTS直接播放
    return this.ttsConfig.voiceModel?.includes('direct') || false;
  }

  // 直接使用PiperTTS播放
  private async playTTSDirectly(text: string, resolve: (value: TTSResult) => void, reject: (reason?: any) => void): Promise<void> {
    try {
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI?.tts?.speak) {
        throw new Error('TTS Direct Play API not available');
      }

      const result = await electronAPI.tts.speak(text, {
        voice: this.getVoiceForLanguage(),
        speed: this.ttsConfig.speed || 1.0,
        volume: this.ttsConfig.volume || 1.0
      });

      if (!result.success) {
        throw new Error(result.error || 'TTS直接播放失败');
      }

      const ttsResult: TTSResult = {
        audioUrl: '',
        duration: this.estimateAudioDuration(text),
        text: text
      };

      this.voiceCoordinator.onTTSComplete();
      this.dispatchEvent(new CustomEvent('ttsCompleted', { detail: ttsResult }));
      resolve(ttsResult);
    } catch (error) {
      this.voiceCoordinator.onTTSComplete();
      reject(error);
    }
  }

  // 使用Blob方式播放
  private async playTTSWithBlob(text: string, resolve: (value: TTSResult) => void, reject: (reason?: any) => void): Promise<void> {
    try {
      // 调用TTS服务生成音频
      const ttsResult = await this.generateTTS(text);

      // 创建音频元素播放
      this.currentAudio = new Audio(ttsResult.audioUrl);

      this.currentAudio.onended = () => {
        this.voiceCoordinator.onTTSComplete();
        this.dispatchEvent(new CustomEvent('ttsCompleted', { detail: ttsResult }));
        // 清理Blob URL
        URL.revokeObjectURL(ttsResult.audioUrl);
        resolve(ttsResult);
      };

      this.currentAudio.onerror = (_error) => {
        this.voiceCoordinator.onTTSComplete();
        URL.revokeObjectURL(ttsResult.audioUrl);
        reject(new Error('TTS音频播放失败'));
      };

      this.currentAudio.play();
      this.dispatchEvent(new CustomEvent('ttsStarted', { detail: ttsResult }));
    } catch (error) {
      this.voiceCoordinator.onTTSComplete();
      reject(error);
    }
  }

  // 生成TTS音频
  private async generateTTS(text: string): Promise<TTSResult> {
    try {
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI?.tts?.synthesize) {
        throw new Error('TTS API not available');
      }

      // 调用PiperTTS合成音频
      const result = await electronAPI.tts.synthesize(text, {
        voice: this.getVoiceForLanguage(),
        speed: this.ttsConfig.speed || 1.0,
        volume: this.ttsConfig.volume || 1.0
      });

      if (!result.success) {
        throw new Error(result.error || 'TTS合成失败');
      }

      // 将Base64音频数据转换为Blob URL
      const audioData = result.audioData;
      const audioBlob = this.base64ToBlob(audioData);
      const audioUrl = URL.createObjectURL(audioBlob);

      return {
        audioUrl: audioUrl,
        duration: this.estimateAudioDuration(text),
        text: text
      };
    } catch (error) {
      console.error('TTS generation failed:', error);
      throw new Error(`TTS生成失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 根据语言获取对应的语音模型
  private getVoiceForLanguage(): string | undefined {
    switch (this.ttsConfig.language) {
      case 'zh-CN':
        return 'zh-CN-female-huayan';
      case 'en-US':
        return 'en-US-female-amy';
      default:
        return undefined;
    }
  }

  // 将Base64数据转换为音频Blob
  private base64ToBlob(base64Data: string): Blob {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type: 'audio/wav' });
  }

  // 估算音频时长（基于文本长度）
  private estimateAudioDuration(text: string): number {
    // 大约每分钟150-200个汉字或300-400个英文单词
    const isChinese = /[\u4e00-\u9fa5]/.test(text);
    if (isChinese) {
      return (text.length / 3) * 1000; // 毫秒
    } else {
      const words = text.split(/\s+/).length;
      return (words / 5) * 1000; // 毫秒
    }
  }

  // 手动开始录音
  startRecording(): void {
    this.voiceCoordinator.startASRListening();
  }

  // 手动停止录音
  stopRecording(): void {
    this.voiceCoordinator.manualEndSpeaking();
  }

  // 暂停ASR
  pauseASR(): void {
    this.stopASRRecording();
  }

  // 恢复ASR
  resumeASR(): void {
    if (this.voiceCoordinator.getState() === VoiceState.ASR_LISTENING) {
      // ASR恢复逻辑将通过语音协调器的事件自动触发
    }
  }

  // 停止所有音频
  stopAllAudio(): void {
    // 停止录音
    this.stopASRRecording();

    // 停止TTS播放
    this.stopTTS();
  }

  // 停止TTS播放
  stopTTS(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;

      // 如果音频URL是Blob URL，清理它
      const src = this.currentAudio.src;
      if (src && src.startsWith('blob:')) {
        URL.revokeObjectURL(src);
      }

      this.currentAudio = null;
    }

    // 确保TTS状态被重置
    this.voiceCoordinator.onTTSComplete();
    this.dispatchEvent(new CustomEvent('ttsStopped'));
  }

  // 检查TTS是否正在播放
  isTTSPlaying(): boolean {
    return !!(this.currentAudio && !this.currentAudio.paused);
  }

  // 更新配置
  updateASRConfig(config: Partial<ASRConfig>): void {
    this.asrConfig = { ...this.asrConfig, ...config };
    // 重新连接ASR如果需要
    if (this.isInitialized) {
      this.reconnectASR();
    }
  }

  updateTTSConfig(config: Partial<TTSConfig>): void {
    this.ttsConfig = { ...this.ttsConfig, ...config };
  }

  updateAudioConfig(config: Partial<AudioConfig>): void {
    this.audioConfig = { ...this.audioConfig, ...config };
    // 重新初始化媒体流如果需要
    if (this.isInitialized && (config.microphoneDeviceId || config.speakerDeviceId)) {
      this.reinitializeMediaStream();
    }
  }

  // 重新连接ASR
  private async reconnectASR(): Promise<void> {
    if (this.asrWebSocket) {
      this.asrWebSocket.close();
      this.asrWebSocket = null;
    }
    await this.connectASR();
  }

  // 重新初始化媒体流
  private async reinitializeMediaStream(): Promise<void> {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    await this.initializeMediaStream();
  }

  // 获取当前状态
  getVoiceState(): VoiceState {
    return this.voiceCoordinator.getState();
  }

  getVoiceCoordinator(): VoiceCoordinator {
    return this.voiceCoordinator;
  }

  isReady(): boolean {
    return this.isInitialized &&
           this.mediaStream !== null &&
           this.asrWebSocket?.readyState === WebSocket.OPEN;
  }

  // 获取可用的TTS语音列表
  async getAvailableVoices(): Promise<any[]> {
    try {
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI?.tts?.getVoices) {
        return [];
      }

      const result = await electronAPI.tts.getVoices();
      if (result.success && result.voices) {
        return result.voices;
      }
      return [];
    } catch (error) {
      console.error('Failed to get available voices:', error);
      return [];
    }
  }

  // 获取可用的音频设备
  async getAudioDevices(): Promise<{microphones: MediaDeviceInfo[], speakers: MediaDeviceInfo[]}> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const microphones = devices.filter(device => device.kind === 'audioinput');
      const speakers = devices.filter(device => device.kind === 'audiooutput');

      return { microphones, speakers };
    } catch (error) {
      console.error('Failed to get audio devices:', error);
      return { microphones: [], speakers: [] };
    }
  }

  // 销毁服务
  destroy(): void {
    this.stopAllAudio();

    if (this.asrWebSocket) {
      this.asrWebSocket.close();
      this.asrWebSocket = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.voiceCoordinator) {
      this.voiceCoordinator.destroy();
    }

    this.isInitialized = false;
    console.debug('Audio Service Manager destroyed');
  }
}