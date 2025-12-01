// apps/desktop-client/src/renderer/utils/interviewGuard.ts
// 面试互斥保护工具，确保全局同一时间只能有一个正在进行的面试
// 核心原则：从 voiceState 获取 interviewId，从数据库获取详细信息

import { getVoiceState } from '../../utils/voiceState';
import { interviewService } from '../interviewer/api/interviewService';

export type InterviewType = 'mock-interview' | 'interview-training';

export interface OngoingInterviewInfo {
  type: InterviewType;
  interviewId: string;
  currentQuestionIndex: number;
  jobPositionTitle?: string;
  status?: string;
}

/**
 * 检查面试状态是否为"进行中"
 * 只有非 idle、completed、error、expired 状态才算进行中
 */
function isInProgressStatus(status: string | undefined): boolean {
  if (!status) return false;
  // 这些状态不算"进行中"
  const finishedStatuses = [
    'idle',
    'mock-interview-completed',
    'mock-interview-error',
    'mock-interview-expired',
    'interview-training-completed',
    'interview-training-error',
    'interview-training-expired',
  ];
  return !finishedStatuses.includes(status);
}

/**
 * 获取当前正在进行的面试（异步版本，从数据库获取详细信息）
 * 【重要】全局只能有一个正在进行的面试，无论是模拟面试还是面试训练
 * @returns 正在进行的面试信息，如果没有则返回 null
 */
export async function getOngoingInterviewAsync(): Promise<OngoingInterviewInfo | null> {
  try {
    const voiceState = getVoiceState();

    // 检查 voiceState 是否有进行中的面试
    if (!voiceState.interviewId) {
      return null;
    }

    // 确定面试类型
    let type: InterviewType | null = null;
    if (voiceState.mode === 'mock-interview') {
      type = 'mock-interview';
    } else if (voiceState.mode === 'interview-training') {
      type = 'interview-training';
    }

    if (!type) {
      return null;
    }

    // 从数据库获取面试详情
    const dbResult = await interviewService.getInterview(voiceState.interviewId);

    if (!dbResult || !dbResult.interview) {
      return null;
    }

    const { interview } = dbResult;

    // 检查是否真正在进行中
    if (!isInProgressStatus(interview.status)) {
      return null;
    }

    // 返回面试信息
    return {
      type,
      interviewId: interview.id,
      currentQuestionIndex: dbResult.questions?.length || 0,
      jobPositionTitle: interview.job_title,
      status: interview.status,
    };
  } catch (error) {
    console.error('[InterviewGuard] 获取进行中面试信息失败:', error);
    return null;
  }
}

/**
 * 获取当前正在进行的面试（同步版本，只检查 voiceState，不查数据库）
 * 用于快速检查，不需要详细信息的场景
 */
export function getOngoingInterviewSync(): { type: InterviewType; interviewId: string } | null {
  try {
    const voiceState = getVoiceState();

    if (!voiceState.interviewId) {
      return null;
    }

    if (voiceState.mode === 'mock-interview') {
      return { type: 'mock-interview', interviewId: voiceState.interviewId };
    } else if (voiceState.mode === 'interview-training') {
      return { type: 'interview-training', interviewId: voiceState.interviewId };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 检查是否可以开始新的面试（异步版本）
 * 【重要】只有当没有任何正在进行的面试时才能开始新面试
 * @param _targetType 要开始的面试类型（保留参数以兼容现有调用）
 * @returns { canStart: boolean, blockingInterview?: OngoingInterviewInfo }
 */
export async function canStartInterviewAsync(_targetType: InterviewType): Promise<{
  canStart: boolean;
  blockingInterview?: OngoingInterviewInfo;
}> {
  const ongoingInterview = await getOngoingInterviewAsync();

  if (ongoingInterview) {
    return {
      canStart: false,
      blockingInterview: ongoingInterview,
    };
  }

  return { canStart: true };
}

/**
 * 检查是否可以开始新的面试（同步版本，快速检查）
 * 注意：此方法不查数据库，只检查 voiceState
 */
export function canStartInterviewSync(_targetType: InterviewType): {
  canStart: boolean;
  hasOngoing: boolean;
} {
  const ongoing = getOngoingInterviewSync();
  return {
    canStart: !ongoing,
    hasOngoing: !!ongoing,
  };
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
