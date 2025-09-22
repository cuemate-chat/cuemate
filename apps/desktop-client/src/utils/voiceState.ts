import { useEffect, useState } from 'react';
export type VoiceMode =
  | 'none'
  | 'voice-test'
  | 'voice-qa'
  | 'mock-interview'
  | 'interview-training';
export type VoiceSubState = 'idle' | 'recording' | 'stopped';

export interface VoiceState {
  mode: VoiceMode;
  subState: VoiceSubState;
  updatedAt: number;
}

const STORAGE_KEY = 'cuemate.voiceState';
const CHANNEL_NAME = 'cuemate.voiceState.channel';

let channel: BroadcastChannel | null = null;
try {
  channel = new BroadcastChannel(CHANNEL_NAME);
} catch {}

export function getVoiceState(): VoiceState {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) return JSON.parse(cached) as VoiceState;
  } catch {}
  return { mode: 'none', subState: 'idle', updatedAt: Date.now() };
}

export function setVoiceState(next: Partial<VoiceState> | VoiceState): VoiceState {
  const current = getVoiceState();
  const merged: VoiceState = {
    mode: next.mode ?? current.mode,
    subState: next.subState ?? current.subState,
    updatedAt: Date.now(),
  } as VoiceState;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {}
  try {
    channel?.postMessage(merged);
  } catch {}
  return merged;
}

export function clearVoiceState(): VoiceState {
  const cleared: VoiceState = { mode: 'none', subState: 'idle', updatedAt: Date.now() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleared));
  } catch {}
  try {
    channel?.postMessage(cleared);
  } catch {}
  return cleared;
}

export function useVoiceState(): VoiceState {
  const [state, setState] = useState<VoiceState>(getVoiceState());

  useEffect(() => {
    const onMessage = (e: MessageEvent<VoiceState>) => setState(e.data);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setState(JSON.parse(e.newValue));
        } catch {}
      }
    };
    channel?.addEventListener('message', onMessage as any);
    window.addEventListener('storage', onStorage);
    return () => {
      try {
        channel?.removeEventListener('message', onMessage as any);
      } catch {}
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return state;
}
