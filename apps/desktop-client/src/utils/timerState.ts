/**
 * 跨窗口计时器状态同步
 * 使用 BroadcastChannel 同步计时器，不存 localStorage
 */

import { useEffect, useState } from 'react';

export interface TimerState {
  duration: number; // 已计时秒数
  isRunning: boolean; // 是否正在计时
}

const CHANNEL_NAME = 'cuemate.timer.channel';

// 内存中的计时器状态
let memoryState: TimerState = {
  duration: 0,
  isRunning: false,
};

// 同窗口内的监听器
const listeners = new Set<(state: TimerState) => void>();

let channel: BroadcastChannel | null = null;
try {
  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (e: MessageEvent<TimerState>) => {
    memoryState = e.data;
    listeners.forEach((listener) => {
      try {
        listener(memoryState);
      } catch {}
    });
  };
} catch {}

export function getTimerState(): TimerState {
  return { ...memoryState };
}

export function setTimerState(next: Partial<TimerState>): TimerState {
  const merged: TimerState = {
    duration: next.duration ?? memoryState.duration,
    isRunning: next.isRunning ?? memoryState.isRunning,
  };

  memoryState = merged;

  // 通过 BroadcastChannel 同步到其他窗口
  try {
    channel?.postMessage(merged);
  } catch {}

  // 通知同窗口内的监听器
  listeners.forEach((listener) => {
    try {
      listener(merged);
    } catch {}
  });

  return merged;
}

export function resetTimerState(): void {
  setTimerState({ duration: 0, isRunning: false });
}

export function useTimerState(): TimerState {
  const [state, setState] = useState<TimerState>(getTimerState());

  useEffect(() => {
    const listener = (newState: TimerState) => setState(newState);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return state;
}
