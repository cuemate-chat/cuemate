/**
 * 音频服务React Hook
 * 用于在面试组件中管理AudioServiceManager
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { AudioServiceManager, ASRResult, TTSResult } from '../audio/AudioServiceManager';
import { AudioServiceFactory } from '../audio/AudioServiceFactory';
import { VoiceState } from '../voice/VoiceCoordinator';

interface UseAudioServiceOptions {
  language?: 'zh-CN' | 'en-US';
  asrServerUrl?: string;
  ttsVoiceModel?: string;
  autoInitialize?: boolean;
}

interface AudioServiceState {
  isInitialized: boolean;
  isInitializing: boolean;
  voiceState: VoiceState;
  audioLevel: number;
  isTTSAvailable: boolean;
  isRecording: boolean;
  isTTSPlaying: boolean;
  error: string | null;
}

export function useAudioService(options: UseAudioServiceOptions = {}) {
  const {
    language = 'zh-CN',
    asrServerUrl,
    ttsVoiceModel = 'direct',
    autoInitialize = true
  } = options;

  const audioServiceRef = useRef<AudioServiceManager | null>(null);
  const [state, setState] = useState<AudioServiceState>({
    isInitialized: false,
    isInitializing: false,
    voiceState: VoiceState.IDLE,
    audioLevel: 0,
    isTTSAvailable: false,
    isRecording: false,
    isTTSPlaying: false,
    error: null
  });

  // 创建音频服务实例
  const createAudioService = useCallback(() => {
    if (audioServiceRef.current) {
      audioServiceRef.current.destroy();
    }

    const audioService = AudioServiceFactory.createForInterview({
      language,
      asrServerUrl,
      ttsVoiceModel
    });

    // 设置事件监听器
    audioService.addEventListener('initialized', () => {
      setState(prev => ({
        ...prev,
        isInitialized: true,
        isInitializing: false,
        error: null
      }));
    });

    audioService.addEventListener('error', ((event: CustomEvent) => {
      setState(prev => ({
        ...prev,
        isInitializing: false,
        error: event.detail?.message || '音频服务错误'
      }));
    }) as EventListener);

    audioService.addEventListener('voiceStateChanged', ((event: CustomEvent) => {
      const voiceState = event.detail as VoiceState;
      setState(prev => ({
        ...prev,
        voiceState,
        isRecording: voiceState === VoiceState.USER_SPEAKING,
        isTTSPlaying: voiceState === VoiceState.TTS_PLAYING
      }));
    }) as EventListener);

    audioService.addEventListener('audioLevel', ((event: CustomEvent) => {
      setState(prev => ({
        ...prev,
        audioLevel: event.detail.level || 0
      }));
    }) as EventListener);

    audioService.addEventListener('ttsAvailable', () => {
      setState(prev => ({
        ...prev,
        isTTSAvailable: true
      }));
    });

    audioService.addEventListener('ttsUnavailable', () => {
      setState(prev => ({
        ...prev,
        isTTSAvailable: false
      }));
    });

    audioService.addEventListener('recordingStarted', () => {
      setState(prev => ({
        ...prev,
        isRecording: true
      }));
    });

    audioService.addEventListener('recordingStopped', () => {
      setState(prev => ({
        ...prev,
        isRecording: false
      }));
    });

    audioService.addEventListener('ttsStarted', () => {
      setState(prev => ({
        ...prev,
        isTTSPlaying: true
      }));
    });

    audioService.addEventListener('ttsCompleted', () => {
      setState(prev => ({
        ...prev,
        isTTSPlaying: false
      }));
    });

    audioService.addEventListener('ttsStopped', () => {
      setState(prev => ({
        ...prev,
        isTTSPlaying: false
      }));
    });

    audioServiceRef.current = audioService;
    return audioService;
  }, [language, asrServerUrl, ttsVoiceModel]);

  // 初始化音频服务
  const initialize = useCallback(async () => {
    if (!audioServiceRef.current) {
      createAudioService();
    }

    if (audioServiceRef.current && !state.isInitialized && !state.isInitializing) {
      setState(prev => ({ ...prev, isInitializing: true, error: null }));

      try {
        await audioServiceRef.current.initialize();
      } catch (error) {
        setState(prev => ({
          ...prev,
          isInitializing: false,
          error: error instanceof Error ? error.message : '初始化失败'
        }));
      }
    }
  }, [createAudioService, state.isInitialized, state.isInitializing]);

  // 开始录音
  const startRecording = useCallback(() => {
    if (audioServiceRef.current?.isReady()) {
      audioServiceRef.current.startRecording();
    }
  }, []);

  // 停止录音
  const stopRecording = useCallback(() => {
    if (audioServiceRef.current?.isReady()) {
      audioServiceRef.current.stopRecording();
    }
  }, []);

  // TTS播放
  const playTTS = useCallback(async (text: string): Promise<TTSResult | null> => {
    if (audioServiceRef.current?.isReady()) {
      try {
        return await audioServiceRef.current.playTTS(text);
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'TTS播放失败'
        }));
        return null;
      }
    }
    return null;
  }, []);

  // 停止TTS
  const stopTTS = useCallback(() => {
    if (audioServiceRef.current) {
      audioServiceRef.current.stopTTS();
    }
  }, []);

  // 停止所有音频
  const stopAllAudio = useCallback(() => {
    if (audioServiceRef.current) {
      audioServiceRef.current.stopAllAudio();
    }
  }, []);

  // 获取音频设备列表
  const getAudioDevices = useCallback(async () => {
    if (audioServiceRef.current) {
      return await audioServiceRef.current.getAudioDevices();
    }
    return { microphones: [], speakers: [] };
  }, []);

  // 监听ASR结果
  const onASRResult = useCallback((callback: (result: ASRResult) => void) => {
    if (audioServiceRef.current) {
      const handler = ((event: CustomEvent) => {
        callback(event.detail);
      }) as EventListener;

      audioServiceRef.current.addEventListener('asrResult', handler);

      return () => {
        audioServiceRef.current?.removeEventListener('asrResult', handler);
      };
    }
    return () => {};
  }, []);

  // 监听语音识别完成
  const onSpeechRecognized = useCallback((callback: (result: ASRResult) => void) => {
    if (audioServiceRef.current) {
      const handler = ((event: CustomEvent) => {
        callback(event.detail);
      }) as EventListener;

      audioServiceRef.current.addEventListener('speechRecognized', handler);

      return () => {
        audioServiceRef.current?.removeEventListener('speechRecognized', handler);
      };
    }
    return () => {};
  }, []);

  // 自动初始化
  useEffect(() => {
    if (autoInitialize) {
      initialize();
    }
  }, [autoInitialize, initialize]);

  // 清理
  useEffect(() => {
    return () => {
      if (audioServiceRef.current) {
        audioServiceRef.current.destroy();
        audioServiceRef.current = null;
      }
    };
  }, []);

  return {
    // 状态
    ...state,
    isReady: audioServiceRef.current?.isReady() || false,

    // 方法
    initialize,
    startRecording,
    stopRecording,
    playTTS,
    stopTTS,
    stopAllAudio,
    getAudioDevices,

    // 事件监听
    onASRResult,
    onSpeechRecognized,

    // 原始服务实例（高级用法）
    audioService: audioServiceRef.current
  };
}