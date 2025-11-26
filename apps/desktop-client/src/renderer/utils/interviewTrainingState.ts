import { useEffect, useState } from 'react';
import { logger } from '../../utils/rendererLogger.js';

// 面试训练阶段状态
export type TrainingPhase =
  | 'listening-interviewer'  // 监听面试官（扬声器）
  | 'ai-generating'          // AI 生成答案中
  | 'listening-candidate';   // 监听面试者（麦克风）

// 跨窗口共享的面试训练状态
export interface InterviewTrainingState {
  aiMessage: string;
  speechText: string;
  candidateAnswer: string; // 用户提交的回答（用于跨窗口触发 AI 分析）
  interviewerQuestion: string; // 面试官问题（从扬声器识别）
  isLoading: boolean;
  isListening: boolean;
  isAutoMode: boolean; // 自动/手动模式
  currentPhase?: TrainingPhase; // 当前阶段
  interviewState?: string; // 面试状态机状态
  lastInterviewerSpeechTime: number; // 面试官最后一次说话时间
  currentRoundReviewId: string | null; // 当前轮次的评审 ID
  updatedAt: number;
}

const STORAGE_KEY = 'cuemate.interviewTraining.state';
const AUTO_MODE_KEY = 'cuemate.interviewTraining.autoMode';
const CHANNEL_NAME = 'cuemate.interviewTraining.channel';

type ChannelMessage = { type: 'state'; payload: InterviewTrainingState };

let channel: BroadcastChannel | null = null;
try {
  channel = new BroadcastChannel(CHANNEL_NAME);
} catch {}

// 监听器（同窗口）
const listeners = new Set<(s: InterviewTrainingState) => void>();

// 获取持久化的自动模式设置
function getPersistedAutoMode(): boolean {
  try {
    const saved = localStorage.getItem(AUTO_MODE_KEY);
    if (saved !== null) return saved === 'true';
  } catch {}
  return false; // 默认手动模式
}

function getDefaultState(): InterviewTrainingState {
  return { aiMessage: '', speechText: '', candidateAnswer: '', interviewerQuestion: '', isLoading: false, isListening: false, isAutoMode: getPersistedAutoMode(), currentPhase: undefined, interviewState: undefined, lastInterviewerSpeechTime: 0, currentRoundReviewId: null, updatedAt: Date.now() };
}

export function getInterviewTrainingState(): InterviewTrainingState {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const state = JSON.parse(cached) as InterviewTrainingState;
      // 确保 isAutoMode 使用持久化的值
      state.isAutoMode = getPersistedAutoMode();
      return state;
    }
  } catch {}
  return getDefaultState();
}

export function setInterviewTrainingState(next: Partial<InterviewTrainingState>): InterviewTrainingState {
  const current = getInterviewTrainingState();
  const merged: InterviewTrainingState = {
    aiMessage: next.aiMessage ?? current.aiMessage,
    speechText: next.speechText ?? current.speechText,
    candidateAnswer: next.candidateAnswer ?? current.candidateAnswer,
    interviewerQuestion: next.interviewerQuestion ?? current.interviewerQuestion,
    isLoading: next.isLoading ?? current.isLoading,
    isListening: next.isListening ?? current.isListening,
    isAutoMode: next.isAutoMode ?? current.isAutoMode,
    currentPhase: next.currentPhase ?? current.currentPhase,
    interviewState: next.interviewState ?? current.interviewState,
    lastInterviewerSpeechTime: next.lastInterviewerSpeechTime ?? current.lastInterviewerSpeechTime,
    currentRoundReviewId: next.currentRoundReviewId ?? current.currentRoundReviewId,
    updatedAt: Date.now(),
  };

  // 如果 isAutoMode 发生变化,持久化保存
  if (next.isAutoMode !== undefined && next.isAutoMode !== current.isAutoMode) {
    try {
      localStorage.setItem(AUTO_MODE_KEY, String(merged.isAutoMode));
    } catch (e) {
      logger.error(`Failed to persist autoMode: ${e}`);
    }
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch (e) {
    logger.error(`Failed to update localStorage: ${e}`);
  }
  try {
    channel?.postMessage({ type: 'state', payload: merged } as ChannelMessage);
  } catch (e) {
    logger.error(`Failed to send BroadcastChannel message: ${e}`);
  }
  // 同窗口立即通知
  listeners.forEach((l) => {
    try {
      l(merged);
    } catch {}
  });
  return merged;
}

export function clearInterviewTrainingState(): InterviewTrainingState {
  // 保留用户的模式偏好设置
  const currentAutoMode = getPersistedAutoMode();
  const cleared: InterviewTrainingState = {
    aiMessage: '',
    speechText: '',
    candidateAnswer: '',
    interviewerQuestion: '',
    isLoading: false,
    isListening: false,
    isAutoMode: currentAutoMode, // 保留用户偏好
    currentPhase: undefined,
    interviewState: undefined,
    lastInterviewerSpeechTime: 0,
    currentRoundReviewId: null,
    updatedAt: Date.now()
  };
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

export function useInterviewTrainingState(): InterviewTrainingState {
  const [state, setState] = useState<InterviewTrainingState>(getInterviewTrainingState());

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
