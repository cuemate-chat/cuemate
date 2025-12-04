import { http } from './http';

//ASR Configuration API

export interface AsrConfig {
  id: number;
  name: string;

  // FunASR WebSocket 配置
  funasrHost: string;
  funasrPort: number;
  funasrChunkInterval: number;
  funasrChunkSizeStart: number;
  funasrChunkSizeMiddle: number;
  funasrChunkSizeEnd: number;
  funasrMode: 'online' | 'offline' | '2pass';
  funasrSampleRate: number;

  // AudioTee 配置
  audioteeSampleRate: 8000 | 16000 | 22050 | 24000 | 32000 | 44100 | 48000;
  audioteeChunkDuration: number;
  audioteeIncludeProcesses: string;
  audioteeExcludeProcesses: string;
  audioteeMuteProcesses: boolean;

  // PiperTTS 配置
  piperDefaultLanguage: 'zh-CN' | 'en-US';
  piperSpeechSpeed: number;
  piperPythonPath: string;

  // 设备持久化配置
  microphoneDeviceId: string;
  microphoneDeviceName: string;
  speakerDeviceId: string;
  speakerDeviceName: string;

  // 测试配置
  testDurationSeconds: number;
  recognitionTimeoutSeconds: number;
  minRecognitionLength: number;
  maxRecognitionLength: number;

  createdAt: number;
  updatedAt: number;
}

export interface AsrService {
  name: string;
  url: string;
}

export interface AsrConfigResponse {
  config: AsrConfig | null;
  services: AsrService[];
}

/**
 * 获取 ASR 配置
 */
export async function getAsrConfig(): Promise<AsrConfigResponse> {
  return http.get<AsrConfigResponse>('/asr/config');
}

/**
 * 保存 ASR 配置
 */
export async function saveAsrConfig(config: Partial<AsrConfig>): Promise<{
  success: boolean;
  config: AsrConfig;
  message: string;
}> {
  return http.post<{
    success: boolean;
    config: AsrConfig;
    message: string;
  }>('/asr/config', config);
}
