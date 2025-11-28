// apps/desktop-client/src/renderer/utils/interviewGuard.ts
// 面试互斥保护工具，确保全局同一时间只能有一个正在进行的面试

import { hasRecoverableInterview, getRecoverableInterviewInfo } from './mockInterviewManager';
import { hasRecoverableTraining, getRecoverableTrainingInfo } from './trainingManager';

export type InterviewType = 'mock-interview' | 'interview-training';

export interface OngoingInterviewInfo {
  type: InterviewType;
  interviewId: string;
  savedAt: number;
  currentQuestionIndex: number;
  jobPositionTitle?: string;
}

/**
 * 检查面试状态是否为"进行中"
 * 只有非 IDLE、COMPLETED、ERROR 状态才算进行中
 */
function isInProgressState(state: string | undefined): boolean {
  if (!state) return false;
  // 这些状态不算"进行中"
  const finishedStates = ['idle', 'completed', 'error'];
  return !finishedStates.includes(state.toLowerCase());
}

/**
 * 获取当前正在进行的面试（全局唯一）
 * 【重要】全局只能有一个正在进行的面试，无论是模拟面试还是面试训练
 * 只检查真正"进行中"的状态，不包括已完成或错误状态
 * @returns 正在进行的面试信息，如果没有则返回 null
 */
export function getOngoingInterview(): OngoingInterviewInfo | null {
  // 优先检查模拟面试（按时间顺序，先检查哪个都可以）
  if (hasRecoverableInterview()) {
    const info = getRecoverableInterviewInfo();
    // 只有状态为"进行中"才算正在进行的面试
    if (info && isInProgressState(info.state)) {
      return {
        type: 'mock-interview',
        interviewId: info.interviewId,
        savedAt: info.savedAt,
        currentQuestionIndex: info.currentQuestionIndex,
        jobPositionTitle: info.jobPosition?.title,
      };
    }
  }

  // 检查面试训练
  if (hasRecoverableTraining()) {
    const info = getRecoverableTrainingInfo();
    // 只有状态为"进行中"才算正在进行的面试
    if (info && isInProgressState(info.state)) {
      return {
        type: 'interview-training',
        interviewId: info.interviewId,
        savedAt: info.savedAt,
        currentQuestionIndex: info.currentQuestionIndex,
        jobPositionTitle: info.jobPosition?.title,
      };
    }
  }

  return null;
}

/**
 * 检查是否可以开始新的面试
 * 【重要】只有当没有任何正在进行的面试时才能开始新面试
 * @param _targetType 要开始的面试类型（保留参数以兼容现有调用）
 * @returns { canStart: boolean, blockingInterview?: OngoingInterviewInfo }
 */
export function canStartInterview(_targetType: InterviewType): {
  canStart: boolean;
  blockingInterview?: OngoingInterviewInfo;
} {
  // 检查是否有任何正在进行的面试（不区分类型）
  const ongoingInterview = getOngoingInterview();

  if (ongoingInterview) {
    return {
      canStart: false,
      blockingInterview: ongoingInterview,
    };
  }

  return { canStart: true };
}

/**
 * 获取面试类型的中文名称
 */
export function getInterviewTypeName(type: InterviewType): string {
  return type === 'mock-interview' ? '模拟面试' : '面试训练';
}

/**
 * 格式化时间差
 */
export function formatTimeSince(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours > 0) {
    return `${hours} 小时前`;
  } else if (minutes > 0) {
    return `${minutes} 分钟前`;
  } else {
    return '刚刚';
  }
}
