// apps/desktop-client/src/renderer/utils/mockInterviewManager.ts

import { logger } from '../../utils/rendererLogger.js';
import { getVoiceState } from '../../utils/voiceState';
import {
  InterviewContext,
  InterviewState,
  InterviewStateMachine,
} from '../ai-question/components/shared/state/InterviewStateMachine';
import { interviewService } from '../interviewer/api/interviewService';

const MAX_AGE = 24 * 60 * 60 * 1000; // 24小时

/**
 * 全局状态机实例
 */
let globalStateMachine: InterviewStateMachine | null = null;

/**
 * 跨窗口同步（BroadcastChannel）
 */
let syncChannel: BroadcastChannel | null = null;

/**
 * 状态订阅者
 */
type StateSubscriber = (state: InterviewState, context: InterviewContext) => void;
const subscribers: Set<StateSubscriber> = new Set();

/**
 * 初始化跨窗口同步
 */
function initSyncChannel() {
  if (!syncChannel) {
    syncChannel = new BroadcastChannel('mock_interview_sync');
    syncChannel.onmessage = (event) => {
      if (event.data.type === 'state-update') {
        // 通知所有订阅者
        subscribers.forEach((callback) => callback(event.data.state, event.data.context));
      }
    };
  }
}

/**
 * 广播状态更新
 */
function broadcastStateUpdate(state: InterviewState, context: InterviewContext) {
  if (syncChannel) {
    syncChannel.postMessage({ type: 'state-update', state, context });
  }
}

/**
 * 启动模拟面试
 */
export function startMockInterview(context: Partial<InterviewContext>): InterviewStateMachine {
  // 如果已有状态机，先停止
  if (globalStateMachine) {
    stopMockInterview();
  }

  // 创建新的状态机
  globalStateMachine = new InterviewStateMachine(context);

  // 监听状态变化
  globalStateMachine.onStateChange((state, ctx) => {
    // 广播给所有窗口
    broadcastStateUpdate(state, ctx);

    // 通知订阅者
    subscribers.forEach((callback) => callback(state, ctx));

    // 注意：状态持久化由 MockInterviewEntryBody.tsx 的 handleStateChange 负责
    // 它会调用 interviewService.updateInterview() 存入数据库
  });

  // 初始化同步通道
  initSyncChannel();

  return globalStateMachine;
}

/**
 * 停止模拟面试
 */
export function stopMockInterview() {
  if (globalStateMachine) {
    globalStateMachine = null;
  }
}

/**
 * 获取当前状态机
 */
export function getMockInterviewStateMachine(): InterviewStateMachine | null {
  return globalStateMachine;
}

/**
 * 订阅状态变化
 */
export function subscribeMockInterview(callback: StateSubscriber): () => void {
  subscribers.add(callback);

  // 返回取消订阅函数
  return () => {
    subscribers.delete(callback);
  };
}

/**
 * 处理过期的面试记录（更新数据库状态）
 */
export async function handleExpiredInterview(interviewId: string): Promise<void> {
  try {
    await interviewService.updateInterview(interviewId, {
      status: 'mock-interview-expired',
      message: '面试记录已过期（超过24小时），自动终止',
    });
  } catch (error) {
    logger.error(`[MockInterviewManager] 更新过期面试状态失败: ${error}`);
  }
}

/**
 * 与数据库校验面试状态
 * 从 voiceState 获取 interviewId，然后查询数据库
 * @returns 返回校验后的状态：
 *   - 'valid': 面试未完成，可以恢复
 *   - 'completed': 面试已完成
 *   - 'not_found': 面试记录不存在
 *   - 'no_interview_id': voiceState 中没有 interviewId
 *   - 'expired': 面试已过期
 */
export async function validateWithDatabase(): Promise<{
  status: 'valid' | 'completed' | 'not_found' | 'no_interview_id' | 'expired';
  interviewId?: string;
  dbData?: any;
  dbStatus?: string;
}> {
  try {
    // 从 voiceState 获取 interviewId
    const voiceState = getVoiceState();
    const interviewId = voiceState.interviewId;

    if (!interviewId) {
      return { status: 'no_interview_id' };
    }

    // 查询数据库中的面试状态
    const result = await interviewService.getInterview(interviewId);

    // 面试记录不存在（可能已被删除）
    if (!result || !result.interview) {
      logger.info(`[MockInterviewManager] 面试记录不存在: ${interviewId}`);
      return { status: 'not_found', interviewId };
    }

    const dbStatus = result.interview.status;
    const startedAt = result.interview.started_at;

    // 检查是否过期（24小时）
    if (startedAt) {
      const age = Date.now() - startedAt;
      if (age > MAX_AGE) {
        await handleExpiredInterview(interviewId);
        return { status: 'expired', interviewId, dbStatus };
      }
    }

    // 检查数据库中的状态是否已完成或出错
    if (dbStatus === 'mock-interview-completed' || dbStatus === 'mock-interview-expired' || dbStatus === 'mock-interview-error') {
      return { status: 'completed', interviewId, dbData: result.interview, dbStatus };
    }

    // 只有模拟面试类型才返回 valid
    if (result.interview.interview_type !== 'mock') {
      return { status: 'not_found', interviewId };
    }

    // 面试仍在进行中
    return { status: 'valid', interviewId, dbData: result.interview, dbStatus };
  } catch (error) {
    logger.error(`[MockInterviewManager] 数据库校验失败: ${error}`);
    return { status: 'no_interview_id' };
  }
}

/**
 * 检查是否有可恢复的面试
 * 从 voiceState 检查是否有 interviewId
 */
export function hasRecoverableInterview(): boolean {
  const voiceState = getVoiceState();
  return !!voiceState.interviewId;
}

/**
 * 从数据库恢复模拟面试
 * 使用 voiceState 中的 interviewId 查询数据库获取完整数据
 */
export async function restoreMockInterview(): Promise<InterviewStateMachine | null> {
  try {
    const voiceState = getVoiceState();
    const interviewId = voiceState.interviewId;

    if (!interviewId) {
      logger.info('[MockInterviewManager] 没有可恢复的面试 ID');
      return null;
    }

    // 从数据库获取面试数据
    const result = await interviewService.getInterview(interviewId);

    if (!result || !result.interview) {
      logger.info(`[MockInterviewManager] 面试记录不存在: ${interviewId}`);
      return null;
    }

    const interview = result.interview;

    // 只恢复模拟面试类型
    if (interview.interview_type !== 'mock') {
      logger.info(`[MockInterviewManager] 不是模拟面试类型: ${interview.interview_type}`);
      return null;
    }

    // 检查状态是否可恢复
    if (interview.status === 'mock-interview-completed' ||
        interview.status === 'mock-interview-expired' ||
        interview.status === 'mock-interview-error') {
      logger.info(`[MockInterviewManager] 面试已结束，状态: ${interview.status}`);
      return null;
    }

    // 从数据库数据构建 context
    const context: Partial<InterviewContext> = {
      interviewId: interview.id,
      jobPosition: {
        id: interview.job_id,
        title: interview.job_title,
        description: interview.job_content,
        resumeId: interview.resumes_id,
        resumeTitle: interview.resumes_title,
        resumeContent: interview.resumes_content,
      },
      resume: {
        resumeTitle: interview.resumes_title,
        resumeContent: interview.resumes_content,
      },
      totalQuestions: interview.question_count,
      duration: interview.duration || 0,
      // 面试配置
      selectedModelId: interview.selected_model_id,
      status: interview.status,
      interviewState: interview.interview_state,
      interviewType: interview.interview_type,
      locale: interview.locale,
      timezone: interview.timezone,
      theme: interview.theme,
      message: interview.message,
      // 恢复问题历史
      currentQuestionIndex: result.questions?.length || 0,
      questionsBank: result.questions || [],
      conversationHistory: result.questions?.map((q) => ({
        question: q.asked_question || q.question,
        answer: q.candidate_answer,
        referenceAnswer: q.reference_answer,
        assessment: q.assessment,
      })) || [],
    };

    // 创建状态机
    const machine = startMockInterview(context);

    // 恢复状态（从数据库的 interview_state 字段）
    if (interview.interview_state) {
      const state = interview.interview_state as InterviewState;
      machine.restoreState(state, context);
    }

    logger.info(`[MockInterviewManager] 面试恢复成功: ${interviewId}`);
    return machine;
  } catch (error) {
    logger.error(`[MockInterviewManager] 恢复失败: ${error}`);
    return null;
  }
}

/**
 * 获取 MAX_AGE 常量（24小时）
 */
export function getMaxAge(): number {
  return MAX_AGE;
}

/**
 * 清理资源（应用退出时调用）
 */
export function cleanup() {
  if (syncChannel) {
    syncChannel.close();
    syncChannel = null;
  }

  subscribers.clear();
}
