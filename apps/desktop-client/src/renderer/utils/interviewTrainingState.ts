import { useEffect, useState } from 'react';

// 面试训练阶段状态
export type TrainingPhase =
  | 'listening-interviewer'  // 监听面试官（扬声器）
  | 'ai-generating'          // AI 生成答案中
  | 'listening-candidate';   // 监听面试者（麦克风）

// 跨窗口共享的面试训练状态（只用于运行时同步，不存 localStorage）
export interface InterviewTrainingState {
  aiMessage: string;                    // AI 参考答案（从数据库获取）
  speechText: string;                   // 实时语音转文字（运行时）
  candidateAnswer: string;              // 用户回答（从数据库获取）
  interviewerQuestion: string;          // 面试官问题（从数据库获取）
  isLoading: boolean;                   // 加载中（运行时）
  isListening: boolean;                 // 麦克风录音中（运行时）
  isAutoMode: boolean;                  // 自动/手动模式（运行时）
  currentPhase?: TrainingPhase;         // 当前阶段（运行时）
  interviewState?: string;              // 面试状态（从数据库获取）
  lastInterviewerSpeechTime: number;    // 面试官最后说话时间（运行时）
  currentRoundReviewId: string | null;  // 当前轮次评审 ID（运行时）
  updatedAt: number;
}

const CHANNEL_NAME = 'cuemate.interviewTraining.channel';

type ChannelMessage = { type: 'state'; payload: InterviewTrainingState };

let channel: BroadcastChannel | null = null;
try {
  channel = new BroadcastChannel(CHANNEL_NAME);
} catch {}

// 内存中的当前状态
let currentState: InterviewTrainingState = getDefaultState();

// 监听器（同窗口）
const listeners = new Set<(s: InterviewTrainingState) => void>();

function getDefaultState(): InterviewTrainingState {
  return {
    aiMessage: '',
    speechText: '',
    candidateAnswer: '',
    interviewerQuestion: '',
    isLoading: false,
    isListening: false,
    isAutoMode: false,
    currentPhase: undefined,
    interviewState: undefined,
    lastInterviewerSpeechTime: 0,
    currentRoundReviewId: null,
    updatedAt: Date.now(),
  };
}

export function getInterviewTrainingState(): InterviewTrainingState {
  return currentState;
}

export function setInterviewTrainingState(next: Partial<InterviewTrainingState>): InterviewTrainingState {
  currentState = {
    aiMessage: next.aiMessage ?? currentState.aiMessage,
    speechText: next.speechText ?? currentState.speechText,
    candidateAnswer: next.candidateAnswer ?? currentState.candidateAnswer,
    interviewerQuestion: next.interviewerQuestion ?? currentState.interviewerQuestion,
    isLoading: next.isLoading ?? currentState.isLoading,
    isListening: next.isListening ?? currentState.isListening,
    isAutoMode: next.isAutoMode ?? currentState.isAutoMode,
    currentPhase: next.currentPhase ?? currentState.currentPhase,
    interviewState: next.interviewState ?? currentState.interviewState,
    lastInterviewerSpeechTime: next.lastInterviewerSpeechTime ?? currentState.lastInterviewerSpeechTime,
    currentRoundReviewId: next.currentRoundReviewId ?? currentState.currentRoundReviewId,
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

export function clearInterviewTrainingState(): InterviewTrainingState {
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

export function useInterviewTrainingState(): InterviewTrainingState {
  const [state, setState] = useState<InterviewTrainingState>(currentState);

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
