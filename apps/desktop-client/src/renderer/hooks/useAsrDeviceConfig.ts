import { useEffect, useRef, useState } from 'react';

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

export function useAsrDeviceConfig() {
  const [config, setConfig] = useState<AsrConfig | null>(null);
  const debounceTimerRef = useRef<any>(null);

  useEffect(() => {
    const electronAPI: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
    (async () => {
      try {
        const res = await electronAPI?.asrConfig?.get?.();
        if (res?.config) setConfig(res.config);
      } catch {}
    })();

    const off = electronAPI?.asrConfig?.onChanged?.((next: any) => setConfig(next));
    return () => {
      try {
        off?.();
      } catch {}
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  function updateDevices(partial: Partial<AsrConfig>, debounceMs: number = 200) {
    const electronAPI: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await electronAPI?.asrConfig?.updateDevices?.(partial);
        if (res?.success && res?.config) setConfig(res.config);
      } catch {}
    }, debounceMs);
  }

  return { config, updateDevices } as const;
}
