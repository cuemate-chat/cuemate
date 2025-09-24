import { http } from './http';

//ASR Configuration API

export interface AsrConfig {
  id: number;
  name: string;

  // FunASR WebSocket配置
  funasr_host: string;
  funasr_port: number;
  funasr_chunk_interval: number;
  funasr_chunk_size_start: number;
  funasr_chunk_size_middle: number;
  funasr_chunk_size_end: number;
  funasr_mode: 'online' | 'offline' | '2pass';
  funasr_sample_rate: number;

  // AudioTee配置
  audiotee_sample_rate: 8000 | 16000 | 22050 | 24000 | 32000 | 44100 | 48000;
  audiotee_chunk_duration: number;
  audiotee_include_processes: string;
  audiotee_exclude_processes: string;
  audiotee_mute_processes: boolean;

  // PiperTTS配置
  piper_default_language: 'zh-CN' | 'en-US';
  piper_speech_speed: number;
  piper_python_path: string;

  // 设备持久化配置
  microphone_device_id: string;
  microphone_device_name: string;
  speaker_device_id: string;
  speaker_device_name: string;

  // 测试配置
  test_duration_seconds: number;
  recognition_timeout_seconds: number;
  min_recognition_length: number;
  max_recognition_length: number;

  created_at: number;
  updated_at: number;
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
