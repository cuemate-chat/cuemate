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
  | 'mock-interview-error'
  // 面试训练（interview-training）
  | 'interview-training-recording'
  | 'interview-training-paused'
  | 'interview-training-completed'
  | 'interview-training-playing'
  | 'interview-training-error'
  // 训练模式特定状态
  | 'training-listening'
  | 'training-paused'
  | 'training-completed';

export interface VoiceState {
  mode: VoiceMode;
  subState: VoiceSubState;
  updatedAt: number;
  interviewId?: string; // 当前面试 ID
}

// localStorage 只存 interviewId
const STORAGE_KEY = 'cuemate.interviewId';
const CHANNEL_NAME = 'cuemate.voiceState.channel';

// 内存中的全局状态（不持久化）
let memoryState: VoiceState = {
  mode: 'none',
  subState: 'idle',
  updatedAt: Date.now(),
  interviewId: undefined,
};

// 初始化时从 localStorage 读取 interviewId
try {
  const savedInterviewId = localStorage.getItem(STORAGE_KEY);
  if (savedInterviewId) {
    memoryState.interviewId = savedInterviewId;
  }
} catch {}

let channel: BroadcastChannel | null = null;
try {
  channel = new BroadcastChannel(CHANNEL_NAME);
  // 监听其他窗口的状态更新
  channel.onmessage = (e: MessageEvent<VoiceState>) => {
    memoryState = e.data;
    // 通知同窗口内的监听器
    listeners.forEach((listener) => {
      try {
        listener(memoryState);
      } catch {}
    });
  };
} catch {}

export function getVoiceState(): VoiceState {
  return { ...memoryState };
}

export function setVoiceState(next: Partial<VoiceState> | VoiceState): VoiceState {
  const merged: VoiceState = {
    mode: next.mode ?? memoryState.mode,
    subState: next.subState ?? memoryState.subState,
    interviewId: 'interviewId' in next ? next.interviewId : memoryState.interviewId,
    updatedAt: Date.now(),
  };

  // 更新内存状态
  memoryState = merged;

  // 只持久化 interviewId 到 localStorage
  try {
    if (merged.interviewId) {
      localStorage.setItem(STORAGE_KEY, merged.interviewId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {}

  // 通过 BroadcastChannel 同步完整状态到其他窗口
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
  const cleared: VoiceState = {
    mode: 'none',
    subState: 'idle',
    updatedAt: Date.now(),
    interviewId: undefined,
  };

  // 更新内存状态
  memoryState = cleared;

  // 清除 localStorage 中的 interviewId
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}

  // 通过 BroadcastChannel 同步到其他窗口
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

    return () => {
      listeners.delete(immediateListener);
    };
  }, []);

  return state;
}
