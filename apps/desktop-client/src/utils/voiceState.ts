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
  | 'mock-interview-expired'
  // 面试训练（interview-training）
  | 'interview-training-recording'
  | 'interview-training-paused'
  | 'interview-training-completed'
  | 'interview-training-playing'
  | 'interview-training-error'
  | 'interview-training-expired'
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

const CHANNEL_NAME = 'cuemate.voiceState.channel';

// 内存中的全局状态（不持久化到 localStorage，使用主进程文件存储）
let memoryState: VoiceState = {
  mode: 'none',
  subState: 'idle',
  updatedAt: Date.now(),
  interviewId: undefined,
};

// 标记是否已完成初始化
let initialized = false;

// 获取 electronAPI（不同窗口可能有不同的 API 对象名）
function getElectronAPI(): any {
  const win = window as any;
  // 按优先级尝试获取 API
  return win.electronAPI || win.electronInterviewerAPI || win.electronHistoryAPI || null;
}

// 异步初始化：从主进程加载 interviewId
export async function initVoiceState(): Promise<VoiceState> {
  if (initialized) {
    return getVoiceState();
  }

  try {
    const api = getElectronAPI();
    if (api?.interviewId?.get) {
      const result = await api.interviewId.get();
      // IPC 返回的是 { success: boolean, interviewId: string | null }
      if (result?.success && result.interviewId) {
        memoryState.interviewId = result.interviewId;
      }
    }
  } catch {
    // 初始化失败时忽略
  }

  initialized = true;
  return getVoiceState();
}

// 在模块加载时尝试异步初始化（不阻塞）
initVoiceState().catch(() => {});

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

  // 持久化 interviewId 到主进程文件存储（fire and forget）
  try {
    const api = getElectronAPI();
    if (api?.interviewId?.set) {
      api.interviewId.set(merged.interviewId || null).catch(() => {});
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

  // 清除主进程文件存储中的 interviewId（fire and forget）
  try {
    const api = getElectronAPI();
    if (api?.interviewId?.clear) {
      api.interviewId.clear().catch(() => {});
    }
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
