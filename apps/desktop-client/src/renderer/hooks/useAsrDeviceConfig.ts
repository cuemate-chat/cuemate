import { useEffect, useRef, useState } from 'react';

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
