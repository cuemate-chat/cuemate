//ASR Configuration API

export interface AsrConfig {
  id: number;
  name: string;
  language: string;
  model: string;
  backend: string;
  task: string;
  min_chunk_size: number;
  no_vad: boolean;
  no_vac: boolean;
  vac_chunk_size: number | null;
  confidence_validation: boolean;
  diarization: boolean;
  punctuation_split: boolean;
  diarization_backend: string;
  buffer_trimming: string | null;
  buffer_trimming_sec: number | null;
  log_level: string;
  frame_threshold: number | null;
  beams: number | null;
  decoder: string | null;
  audio_max_len: number | null;
  audio_min_len: number | null;
  never_fire: boolean;
  init_prompt: string | null;
  static_init_prompt: string | null;
  max_context_tokens: number | null;
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
  const response = await fetch('/api/asr/config');
  if (!response.ok) {
    throw new Error('获取配置失败');
  }
  return response.json();
}

/**
 * 保存 ASR 配置
 */
export async function saveAsrConfig(config: Partial<AsrConfig>): Promise<{
  success: boolean;
  config: AsrConfig;
  message: string;
}> {
  const response = await fetch('/api/asr/config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || '保存失败');
  }

  return data;
}
