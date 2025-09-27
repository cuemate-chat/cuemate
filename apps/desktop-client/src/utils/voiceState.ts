import { useEffect, useState } from 'react';

// 同窗口内的状态监听器
const listeners = new Set<(state: VoiceState) => void>();
export type VoiceMode =
  | 'none'
  | 'voice-test'
  | 'voice-qa'
  | 'mock-interview'
  | 'interview-training';
export type VoiceSubState =
  | 'idle'
  // 语音测试（voice-test）
  | 'voice-mic-testing'
  | 'voice-mic-end'
  | 'voice-speak-testing'
  | 'voice-speak-end'
  // 语音提问（voice-qa）
  | 'voice-speaking'
  | 'voice-end'
  // 模拟面试（mock-interview）
  | 'mock-interview-recording'
  | 'mock-interview-paused'
  | 'mock-interview-completed'
  | 'mock-interview-playing'
  // 面试训练（interview-training）
  | 'interview-training-recording'
  | 'interview-training-paused'
  | 'interview-training-completed'
  | 'interview-training-playing';

export interface VoiceState {
  mode: VoiceMode;
  subState: VoiceSubState;
  updatedAt: number;
  // 计时器相关状态
  timerDuration?: number; // 计时器时长（秒）
  timerStarted?: boolean; // 计时器是否已开始
  // 面试相关状态
  interviewId?: string; // 当前面试ID
}

const STORAGE_KEY = 'cuemate.voiceState';
const CHANNEL_NAME = 'cuemate.voiceState.channel';
const SESSION_KEY = 'cuemate.session.startTime';

let channel: BroadcastChannel | null = null;
try {
  channel = new BroadcastChannel(CHANNEL_NAME);
} catch {}

function shouldResetState(): boolean {
  try {
    const currentSession = Date.now();
    const lastSession = localStorage.getItem(SESSION_KEY);

    if (!lastSession) {
      // 首次启动，记录会话时间
      localStorage.setItem(SESSION_KEY, currentSession.toString());
      return true;
    }

    const lastSessionTime = parseInt(lastSession);
    const timeDiff = currentSession - lastSessionTime;

    // 如果距离上次会话超过5分钟，认为是新的应用会话，需要重置状态
    if (timeDiff > 5 * 60 * 1000) {
      localStorage.setItem(SESSION_KEY, currentSession.toString());
      return true;
    }

    return false;
  } catch {
    return true; // 出错时默认重置状态
  }
}

export function getVoiceState(): VoiceState {
  // 检查是否需要重置状态
  if (shouldResetState()) {
    const defaultState: VoiceState = { mode: 'none', subState: 'idle', updatedAt: Date.now() };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
    } catch {}
    return defaultState;
  }

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
    timerDuration: next.timerDuration ?? current.timerDuration,
    timerStarted: next.timerStarted ?? current.timerStarted,
    interviewId: next.interviewId ?? current.interviewId,
    updatedAt: Date.now(),
  } as VoiceState;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {}
  try {
    channel?.postMessage(merged);
  } catch {}

  // 立即通知同窗口内的监听器
  listeners.forEach((listener) => {
    try {
      listener(merged);
    } catch {}
  });

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

  // 立即通知同窗口内的监听器
  listeners.forEach((listener) => {
    try {
      listener(cleared);
    } catch {}
  });

  return cleared;
}

export function useVoiceState(): VoiceState {
  const [state, setState] = useState<VoiceState>(getVoiceState());

  useEffect(() => {
    // 同窗口内的立即监听器
    const immediateListener = (newState: VoiceState) => setState(newState);
    listeners.add(immediateListener);

    // 跨窗口的事件监听器
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
      listeners.delete(immediateListener);
      try {
        channel?.removeEventListener('message', onMessage as any);
      } catch {}
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return state;
}
