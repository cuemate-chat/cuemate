/**
 * 音频服务工厂
 * 用于创建和配置AudioServiceManager实例
 */

import { AudioServiceManager, ASRConfig, TTSConfig, AudioConfig } from './AudioServiceManager';

export class AudioServiceFactory {
  // 创建默认的面试音频服务
  static createForInterview(options: {
    asrServerUrl?: string;
    language?: 'zh-CN' | 'en-US';
    ttsVoiceModel?: string;
    enableAutoGainControl?: boolean;
  } = {}): AudioServiceManager {
    const {
      asrServerUrl = 'ws://localhost:10095',
      language = 'zh-CN',
      ttsVoiceModel = 'default',
      enableAutoGainControl = true
    } = options;

    // ASR配置
    const asrConfig: ASRConfig = {
      serverUrl: asrServerUrl,
      language: language,
      sampleRate: 16000,
      enableHotwords: false
    };

    // TTS配置
    const ttsConfig: TTSConfig = {
      language: language,
      voiceModel: ttsVoiceModel,
      speed: 1.0,
      volume: 0.8
    };

    // 音频配置
    const audioConfig: AudioConfig = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: enableAutoGainControl
    };

    return new AudioServiceManager(asrConfig, ttsConfig, audioConfig);
  }

  // 创建高质量的面试音频服务（优化设置）
  static createHighQuality(language: 'zh-CN' | 'en-US' = 'zh-CN'): AudioServiceManager {
    return this.createForInterview({
      language,
      ttsVoiceModel: 'direct', // 使用直接播放模式获得更好的性能
      enableAutoGainControl: true
    });
  }

  // 创建快速响应的面试音频服务（性能优先）
  static createFastResponse(language: 'zh-CN' | 'en-US' = 'zh-CN'): AudioServiceManager {
    return this.createForInterview({
      language,
      ttsVoiceModel: 'direct',
      enableAutoGainControl: false // 禁用自动增益控制以减少延迟
    });
  }

  // 创建自定义配置的音频服务
  static createCustom(
    asrConfig: ASRConfig,
    ttsConfig: TTSConfig,
    audioConfig?: AudioConfig
  ): AudioServiceManager {
    return new AudioServiceManager(asrConfig, ttsConfig, audioConfig);
  }

  // 获取推荐的ASR服务器URL配置
  static getRecommendedASRUrls(): { [key: string]: string } {
    return {
      local: 'ws://localhost:10095',
      development: 'ws://localhost:10095',
      production: 'ws://localhost:10095'
    };
  }

  // 获取支持的语言列表
  static getSupportedLanguages(): Array<{ code: string; name: string; ttsVoice: string }> {
    return [
      {
        code: 'zh-CN',
        name: '中文简体',
        ttsVoice: 'zh-CN-female-huayan'
      },
      {
        code: 'en-US',
        name: 'English (US)',
        ttsVoice: 'en-US-female-amy'
      }
    ];
  }

  // 验证配置是否有效
  static validateConfig(
    asrConfig: ASRConfig,
    ttsConfig: TTSConfig,
    _audioConfig?: AudioConfig
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证ASR配置
    if (!asrConfig.serverUrl) {
      errors.push('ASR服务器URL不能为空');
    }
    if (!asrConfig.serverUrl.startsWith('ws://') && !asrConfig.serverUrl.startsWith('wss://')) {
      errors.push('ASR服务器URL必须是WebSocket地址');
    }
    if (asrConfig.sampleRate && (asrConfig.sampleRate < 8000 || asrConfig.sampleRate > 48000)) {
      errors.push('采样率必须在8000-48000Hz之间');
    }

    // 验证TTS配置
    if (!ttsConfig.language) {
      errors.push('TTS语言不能为空');
    }
    if (!ttsConfig.voiceModel) {
      errors.push('TTS语音模型不能为空');
    }
    if (ttsConfig.speed && (ttsConfig.speed < 0.5 || ttsConfig.speed > 2.0)) {
      errors.push('TTS语速必须在0.5-2.0之间');
    }
    if (ttsConfig.volume && (ttsConfig.volume < 0 || ttsConfig.volume > 1.0)) {
      errors.push('TTS音量必须在0-1.0之间');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}