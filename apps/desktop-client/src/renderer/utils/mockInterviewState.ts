import { useEffect, useState } from 'react';

// 跨窗口共享的模拟面试状态（只用于运行时同步，不存 localStorage）
export interface MockInterviewState {
  aiMessage: string;           // AI 参考答案（从数据库获取）
  speechText: string;          // 实时语音转文字（运行时）
  candidateAnswer: string;     // 用户回答（从数据库获取）
  isLoading: boolean;          // 加载中（运行时）
  isListening: boolean;        // 麦克风录音中（运行时）
  isAutoMode: boolean;         // 自动/手动模式（运行时）
  interviewState?: string;     // 面试状态（从数据库获取）
  updatedAt: number;
}

const CHANNEL_NAME = 'cuemate.mockInterview.channel';

type ChannelMessage = { type: 'state'; payload: MockInterviewState };

let channel: BroadcastChannel | null = null;
try {
  channel = new BroadcastChannel(CHANNEL_NAME);
} catch {}

// 内存中的当前状态
let currentState: MockInterviewState = getDefaultState();

// 监听器（同窗口）
const listeners = new Set<(s: MockInterviewState) => void>();

function getDefaultState(): MockInterviewState {
  return {
    aiMessage: '',
    speechText: '',
    candidateAnswer: '',
    isLoading: false,
    isListening: false,
    isAutoMode: false,
    interviewState: undefined,
    updatedAt: Date.now(),
  };
}

export function getMockInterviewState(): MockInterviewState {
  return currentState;
}

export function setMockInterviewState(next: Partial<MockInterviewState>): MockInterviewState {
  currentState = {
    aiMessage: next.aiMessage ?? currentState.aiMessage,
    speechText: next.speechText ?? currentState.speechText,
    candidateAnswer: next.candidateAnswer ?? currentState.candidateAnswer,
    isLoading: next.isLoading ?? currentState.isLoading,
    isListening: next.isListening ?? currentState.isListening,
    isAutoMode: next.isAutoMode ?? currentState.isAutoMode,
    interviewState: next.interviewState ?? currentState.interviewState,
    updatedAt: Date.now(),
  };

  // 通过 BroadcastChannel 同步到其他窗口
  try {
    channel?.postMessage({ type: 'state', payload: currentState } as ChannelMessage);
  } catch {}

  // 同窗口立即通知
  listeners.forEach((l) => {
    try {
      l(currentState);
    } catch {}
  });

  return currentState;
}

export function clearMockInterviewState(): MockInterviewState {
  currentState = getDefaultState();

  try {
    channel?.postMessage({ type: 'state', payload: currentState } as ChannelMessage);
  } catch {}

  listeners.forEach((l) => {
    try {
      l(currentState);
    } catch {}
  });

  return currentState;
}

export function useMockInterviewState(): MockInterviewState {
  const [state, setState] = useState<MockInterviewState>(currentState);

  useEffect(() => {
    const onMessage = (e: MessageEvent<ChannelMessage>) => {
      if (e.data?.type === 'state') {
        currentState = e.data.payload;
        setState(e.data.payload);
      }
    };

    listeners.add(setState as any);
    channel?.addEventListener('message', onMessage as any);

    return () => {
      listeners.delete(setState as any);
      try {
        channel?.removeEventListener('message', onMessage as any);
      } catch {}
    };
  }, []);

  return state;
}
