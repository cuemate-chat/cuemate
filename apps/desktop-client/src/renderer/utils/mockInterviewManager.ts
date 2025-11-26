// apps/desktop-client/src/renderer/utils/mockInterviewManager.ts

import { logger } from '../../utils/rendererLogger.js';
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
 * 持久化到 localStorage（防抖）
 */
function schedulePersist() {
  if (persistTimer) {
    clearTimeout(persistTimer);
  }

  persistTimer = setTimeout(() => {
    persistCurrentState();
  }, 1000); // 1秒防抖
}

/**
 * 立即持久化当前状态
 */
function persistCurrentState() {
  if (!globalStateMachine) {
    return;
  }

  const context = globalStateMachine.getContext();
  const state = globalStateMachine.getState();

  const data: PersistedMockInterviewData = {
    interviewId: context.interviewId,
    jobPosition: context.jobPosition,
    resume: context.resume,
    questionsBank: context.questionsBank,
    currentQuestionIndex: context.currentQuestionIndex,
    totalQuestions: context.totalQuestions,
    state,
    savedAt: Date.now(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log('[MockInterviewManager] 状态已持久化:', state);
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
    console.log('[MockInterviewManager] 持久化数据已清除');
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
    console.warn('[MockInterviewManager] 已存在状态机，先停止');
    stopMockInterview();
  }

  // 创建新的状态机
  globalStateMachine = new InterviewStateMachine(context);

  // 监听状态变化
  globalStateMachine.onStateChange((state, ctx) => {
    console.log('[MockInterviewManager] 状态变化:', state);

    // 广播给所有窗口
    broadcastStateUpdate(state, ctx);

    // 通知订阅者
    subscribers.forEach((callback) => callback(state, ctx));

    // 持久化（防抖）
    schedulePersist();

    // 关键状态立即持久化
    if (
      state === InterviewState.AI_THINKING ||
      state === InterviewState.AI_SPEAKING ||
      state === InterviewState.USER_LISTENING ||
      state === InterviewState.USER_SPEAKING
    ) {
      persistCurrentState();
    }
  });

  // 初始化同步通道
  initSyncChannel();

  console.log('[MockInterviewManager] 模拟面试已启动:', context.interviewId);

  return globalStateMachine;
}

/**
 * 停止模拟面试
 */
export function stopMockInterview() {
  if (globalStateMachine) {
    console.log('[MockInterviewManager] 停止模拟面试');

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
    console.log('[MockInterviewManager] 已将过期面试标记为 expired:', interviewId);
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
      console.log('[MockInterviewManager] 没有可恢复的数据');
      return null;
    }

    const data: PersistedMockInterviewData = JSON.parse(saved);

    console.log('[MockInterviewManager] 开始恢复模拟面试:', data.interviewId);

    // 重新创建 context
    const context: Partial<InterviewContext> = {
      interviewId: data.interviewId,
      jobPosition: data.jobPosition,
      resume: data.resume,
      questionsBank: data.questionsBank,
      currentQuestionIndex: data.currentQuestionIndex,
      totalQuestions: data.totalQuestions,
    };

    // 创建状态机
    const machine = startMockInterview(context);

    // 恢复状态
    machine.restoreState(data.state, context);

    console.log('[MockInterviewManager] 模拟面试恢复成功');

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
