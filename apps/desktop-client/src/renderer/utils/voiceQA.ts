import { useEffect, useState } from 'react';
import {
  startMicrophoneRecognition,
  type MicrophoneRecognitionController,
} from '../../utils/audioRecognition';

// 跨窗口共享的语音问答状态
export interface VoiceQAState {
  isRecording: boolean;
  confirmedText: string;
  tempText: string;
  updatedAt: number;
}

const STORAGE_KEY = 'cuemate.voiceQA.state';
const CHANNEL_NAME = 'cuemate.voiceQA.channel';

type ChannelMessage = { type: 'state'; payload: VoiceQAState } | { type: 'command'; cmd: 'stop' };

let channel: BroadcastChannel | null = null;
try {
  channel = new BroadcastChannel(CHANNEL_NAME);
} catch {}

// 监听器（同窗口）
const listeners = new Set<(s: VoiceQAState) => void>();

function getDefaultState(): VoiceQAState {
  return { isRecording: false, confirmedText: '', tempText: '', updatedAt: Date.now() };
}

export function getVoiceQAState(): VoiceQAState {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) return JSON.parse(cached) as VoiceQAState;
  } catch {}
  return getDefaultState();
}

function setVoiceQAState(next: Partial<VoiceQAState> | VoiceQAState): VoiceQAState {
  const current = getVoiceQAState();
  const merged: VoiceQAState = {
    isRecording: next.hasOwnProperty('isRecording')
      ? (next as VoiceQAState).isRecording
      : current.isRecording,
    confirmedText: (next as VoiceQAState).confirmedText ?? current.confirmedText,
    tempText: (next as VoiceQAState).tempText ?? current.tempText,
    updatedAt: Date.now(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {}
  try {
    channel?.postMessage({ type: 'state', payload: merged } as ChannelMessage);
  } catch {}
  // 同窗口立即通知
  listeners.forEach((l) => {
    try {
      l(merged);
    } catch {}
  });
  return merged;
}

export function clearVoiceQAState(): VoiceQAState {
  const cleared = getDefaultState();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleared));
  } catch {}
  try {
    channel?.postMessage({ type: 'state', payload: cleared } as ChannelMessage);
  } catch {}
  listeners.forEach((l) => {
    try {
      l(cleared);
    } catch {}
  });
  return cleared;
}

export function useVoiceQAState(): VoiceQAState {
  const [state, setState] = useState<VoiceQAState>(getVoiceQAState());

  useEffect(() => {
    const onMessage = (e: MessageEvent<ChannelMessage>) => {
      if (e.data?.type === 'state') setState(e.data.payload);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setState(JSON.parse(e.newValue));
        } catch {}
      }
    };
    listeners.add(setState as any);
    channel?.addEventListener('message', onMessage as any);
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(setState as any);
      try {
        channel?.removeEventListener('message', onMessage as any);
      } catch {}
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return state;
}

// 单进程内的识别控制器（只有触发开始的窗口会存在）
let recognitionController: MicrophoneRecognitionController | null = null;
let confirmedTextRef = '';

// 监听来自其他窗口的“停止”命令
try {
  channel?.addEventListener('message', (e: MessageEvent<ChannelMessage>) => {
    if (e.data?.type === 'command' && e.data.cmd === 'stop') {
      void stopVoiceQAInternal();
    }
  });
} catch {}

export async function startVoiceQA(deviceId?: string, initialConfirmed?: string): Promise<void> {
  if (getVoiceQAState().isRecording) return; // 已在录制
  confirmedTextRef = initialConfirmed || '';
  setVoiceQAState({ isRecording: true, confirmedText: initialConfirmed || '', tempText: '' });

  const controller = await startMicrophoneRecognition({
    deviceId,
    initialText: confirmedTextRef, // 传递初始文本给audioRecognition处理叠加
    onText: (text, isFinal) => {
      const t = (text || '').trim();
      if (!t) return;
      // audioRecognition.ts 已经处理了文本叠加，直接使用传来的文本
      if (isFinal) {
        setVoiceQAState({ confirmedText: t, tempText: '' });
      } else {
        // 对于临时文本，需要去掉初始文本部分，只显示新识别的部分
        const newText = confirmedTextRef ? t.replace(confirmedTextRef, '').trim() : t;
        setVoiceQAState({ confirmedText: confirmedTextRef, tempText: newText });
      }
    },
    onError: () => {
      clearVoiceQAState();
    },
  });
  recognitionController = controller;
}

async function stopVoiceQAInternal(): Promise<void> {
  try {
    await recognitionController?.stop();
  } catch {}
  recognitionController = null;
  setVoiceQAState({ isRecording: false });
}

export async function stopVoiceQA(): Promise<void> {
  // 广播停止命令，确保拥有控制器的窗口停止
  try {
    channel?.postMessage({ type: 'command', cmd: 'stop' } as ChannelMessage);
  } catch {}
  await stopVoiceQAInternal();
}
