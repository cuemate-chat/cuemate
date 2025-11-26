// apps/desktop-client/src/renderer/utils/interviewGuard.ts
// 面试互斥保护工具，确保同一时间只能进行一种面试模式

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
 * 检查是否有正在进行的面试（包括模拟面试和面试训练）
 * @param excludeType 排除的类型（用于在自己的入口页面排除自己的类型）
 * @returns 正在进行的面试信息，如果没有则返回 null
 */
export function getOngoingInterview(excludeType?: InterviewType): OngoingInterviewInfo | null {
  // 检查模拟面试
  if (excludeType !== 'mock-interview' && hasRecoverableInterview()) {
    const info = getRecoverableInterviewInfo();
    if (info) {
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
  if (excludeType !== 'interview-training' && hasRecoverableTraining()) {
    const info = getRecoverableTrainingInfo();
    if (info) {
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
 * @param targetType 要开始的面试类型
 * @returns { canStart: boolean, blockingInterview?: OngoingInterviewInfo }
 */
export function canStartInterview(targetType: InterviewType): {
  canStart: boolean;
  blockingInterview?: OngoingInterviewInfo;
} {
  // 检查是否有其他类型的面试正在进行
  const ongoingInterview = getOngoingInterview(targetType);

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
