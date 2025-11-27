// apps/desktop-client/src/renderer/utils/mockInterviewManager.ts

import { logger } from '../../utils/rendererLogger.js';
import { getVoiceState } from '../../utils/voiceState';
import {
  InterviewContext,
  InterviewState,
  InterviewStateMachine,
} from '../ai-question/components/shared/state/InterviewStateMachine';
import { interviewService } from '../interviewer/api/interviewService';

/**
 * 持久化数据结构
 */
interface PersistedMockInterviewData {
  interviewId: string;
  jobPosition: any;
  resume: any;
  questionsBank: any[];
  currentQuestionIndex: number;
  totalQuestions: number;
  state: InterviewState;
  savedAt: number;
  // 新增：恢复面试时需要的关键数据
  elapsedTime?: number; // 已用时长（秒）
  currentQuestion?: string; // 当前面试问题
  currentAnswer?: string; // AI 参考答案
}

const STORAGE_KEY = 'cuemate_mock_interview_state';
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
 * 持久化定时器
 */
let persistTimer: NodeJS.Timeout | null = null;

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
 * 立即持久化当前状态
 * 从多个数据源获取最完整的数据，确保恢复时不丢失信息
 */
function persistCurrentState() {
  if (!globalStateMachine) {
    return;
  }

  const context = globalStateMachine.getContext();
  const state = globalStateMachine.getState();

  // 获取当前计时器时长
  const voiceState = getVoiceState();
  const elapsedTime = voiceState.timerDuration || 0;

  // 从 mockInterviewState 获取 UI 状态中的 AI 回答（作为备用数据源）
  let aiMessageFromUI = '';
  try {
    const mockStateStr = localStorage.getItem('cuemate.mockInterview.state');
    if (mockStateStr) {
      const mockState = JSON.parse(mockStateStr);
      aiMessageFromUI = mockState.aiMessage || '';
    }
  } catch {}

  // 优先使用 context.currentAnswer，如果为空则使用 UI 状态中的 aiMessage
  const currentAnswer = context.currentAnswer || aiMessageFromUI;

  const data: PersistedMockInterviewData = {
    interviewId: context.interviewId,
    jobPosition: context.jobPosition,
    resume: context.resume,
    questionsBank: context.questionsBank,
    currentQuestionIndex: context.currentQuestionIndex,
    totalQuestions: context.totalQuestions,
    state,
    savedAt: Date.now(),
    // 保存恢复面试需要的关键数据
    elapsedTime,
    currentQuestion: context.currentQuestion,
    currentAnswer: currentAnswer, // 优先使用状态机数据，备用 UI 数据
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    logger.error(`[MockInterviewManager] 持久化失败: ${error}`);
  }
}

/**
 * 清除持久化数据
 */
function clearPersistedData() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    logger.error(`[MockInterviewManager] 清除持久化数据失败: ${error}`);
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

    // 所有状态变化都立即持久化，确保数据不丢失
    // 只有 COMPLETED 和 ERROR 状态不需要持久化（会被清除）
    if (state !== InterviewState.COMPLETED && state !== InterviewState.ERROR) {
      persistCurrentState();
    }
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
    // 重置状态机
    globalStateMachine.reset();
    globalStateMachine = null;

    // 清除持久化数据
    clearPersistedData();

    // 清除定时器
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
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
 * 处理过期的面试记录（更新数据库状态并清除本地数据）
 */
async function handleExpiredInterview(interviewId: string): Promise<void> {
  try {
    // 更新数据库状态为过期
    await interviewService.updateInterview(interviewId, {
      status: 'mock-interview-expired',
      message: '面试记录已过期（超过24小时），自动终止',
    });
  } catch (error) {
    logger.error(`[MockInterviewManager] 更新过期面试状态失败: ${error}`);
  } finally {
    // 无论数据库更新是否成功，都清除本地数据
    clearPersistedData();
  }
}

/**
 * 检查是否有可恢复的面试
 */
export function hasRecoverableInterview(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return false;

    const data: PersistedMockInterviewData = JSON.parse(saved);

    // 检查是否过期（24小时）
    const age = Date.now() - data.savedAt;
    if (age > MAX_AGE) {
      // 异步处理过期面试（更新数据库状态）
      handleExpiredInterview(data.interviewId);
      return false;
    }

    // 检查状态（已完成或错误状态不恢复）
    if (data.state === InterviewState.COMPLETED || data.state === InterviewState.ERROR) {
      clearPersistedData();
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * 获取可恢复的面试信息
 */
export function getRecoverableInterviewInfo(): PersistedMockInterviewData | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

/**
 * 从 localStorage 恢复模拟面试
 */
export function restoreMockInterview(): InterviewStateMachine | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return null;
    }

    const data: PersistedMockInterviewData = JSON.parse(saved);

    // 重新创建 context，包含当前问题和答案
    const context: Partial<InterviewContext> = {
      interviewId: data.interviewId,
      jobPosition: data.jobPosition,
      resume: data.resume,
      questionsBank: data.questionsBank,
      currentQuestionIndex: data.currentQuestionIndex,
      totalQuestions: data.totalQuestions,
      currentQuestion: data.currentQuestion || '',
      currentAnswer: data.currentAnswer || '',
    };

    // 创建状态机
    const machine = startMockInterview(context);

    // 恢复状态（包含 currentQuestion 和 currentAnswer）
    machine.restoreState(data.state, context);

    return machine;
  } catch (error) {
    logger.error(`[MockInterviewManager] 恢复失败: ${error}`);
    clearPersistedData();
    return null;
  }
}

/**
 * 清理资源（应用退出时调用）
 */
export function cleanup() {
  if (syncChannel) {
    syncChannel.close();
    syncChannel = null;
  }

  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }

  subscribers.clear();
}
