import { useEffect, useState } from 'react';

// 跨窗口共享的模拟面试状态
export interface MockInterviewState {
  aiMessage: string;
  speechText: string;
  candidateAnswer: string; // 用户提交的回答（用于跨窗口触发AI分析）
  isLoading: boolean;
  isListening: boolean;
  isAutoMode: boolean; // 自动/手动模式
  updatedAt: number;
}

const STORAGE_KEY = 'cuemate.mockInterview.state';
const CHANNEL_NAME = 'cuemate.mockInterview.channel';

type ChannelMessage = { type: 'state'; payload: MockInterviewState };

let channel: BroadcastChannel | null = null;
try {
  channel = new BroadcastChannel(CHANNEL_NAME);
} catch {}

// 监听器（同窗口）
const listeners = new Set<(s: MockInterviewState) => void>();

function getDefaultState(): MockInterviewState {
  return { aiMessage: '', speechText: '', candidateAnswer: '', isLoading: false, isListening: false, isAutoMode: true, updatedAt: Date.now() };
}

export function getMockInterviewState(): MockInterviewState {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) return JSON.parse(cached) as MockInterviewState;
  } catch {}
  return getDefaultState();
}

export function setMockInterviewState(next: Partial<MockInterviewState>): MockInterviewState {
  const current = getMockInterviewState();
  const merged: MockInterviewState = {
    aiMessage: next.aiMessage ?? current.aiMessage,
    speechText: next.speechText ?? current.speechText,
    candidateAnswer: next.candidateAnswer ?? current.candidateAnswer,
    isLoading: next.isLoading ?? current.isLoading,
    isListening: next.isListening ?? current.isListening,
    isAutoMode: next.isAutoMode ?? current.isAutoMode,
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

export function clearMockInterviewState(): MockInterviewState {
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

export function useMockInterviewState(): MockInterviewState {
  const [state, setState] = useState<MockInterviewState>(getMockInterviewState());

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
