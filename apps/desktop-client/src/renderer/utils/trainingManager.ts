// apps/desktop-client/src/renderer/utils/trainingManager.ts

import { logger } from '../../utils/rendererLogger.js';
import { getVoiceState } from '../../utils/voiceState';
import {
  TrainingContext,
  TrainingState,
  TrainingStateMachine,
} from '../ai-question/components/shared/state/TrainingStateMachine';
import { interviewService } from '../interviewer/api/interviewService';

/**
 * 持久化数据结构
 */
interface PersistedTrainingData {
  interviewId: string;
  jobPosition: any;
  resume: any;
  currentQuestionIndex: number;
  totalQuestions: number;
  state: TrainingState;
  savedAt: number;
  speakerConfig?: {
    deviceId: string;
    sessionId: string;
  };
  // 新增：恢复面试时需要的关键数据
  elapsedTime?: number; // 已用时长（秒）
  currentQuestion?: string; // 当前面试问题
  currentAnswer?: string; // AI 参考答案
}

const STORAGE_KEY = 'cuemate_interview_training_state';
const MAX_AGE = 24 * 60 * 60 * 1000; // 24小时

/**
 * 全局状态机实例
 */
let globalStateMachine: TrainingStateMachine | null = null;

/**
 * 全局扬声器控制器（如果需要的话）
 */
let globalSpeakerController: any = null;
let globalSpeakerConfig: { deviceId: string; sessionId: string } | null = null;

/**
 * 跨窗口同步
 */
let syncChannel: BroadcastChannel | null = null;

/**
 * 状态订阅者
 */
type StateSubscriber = (state: TrainingState, context: TrainingContext) => void;
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
    syncChannel = new BroadcastChannel('interview_training_sync');
    syncChannel.onmessage = (event) => {
      if (event.data.type === 'state-update') {
        subscribers.forEach((callback) => callback(event.data.state, event.data.context));
      }
    };
  }
}

/**
 * 广播状态更新
 */
function broadcastStateUpdate(state: TrainingState, context: TrainingContext) {
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
  }, 1000);
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

  // 从 interviewTrainingState 获取 UI 状态中的 AI 回答（作为备用数据源）
  let aiMessageFromUI = '';
  try {
    const trainingStateStr = localStorage.getItem('cuemate.interviewTraining.state');
    if (trainingStateStr) {
      const trainingState = JSON.parse(trainingStateStr);
      aiMessageFromUI = trainingState.aiMessage || '';
    }
  } catch {}

  // 优先使用 context.referenceAnswer，如果为空则使用 UI 状态中的 aiMessage
  const currentAnswer = context.referenceAnswer || aiMessageFromUI;

  const data: PersistedTrainingData = {
    interviewId: context.interviewId,
    jobPosition: context.jobPosition,
    resume: context.resume,
    currentQuestionIndex: context.currentQuestionIndex,
    totalQuestions: context.totalQuestions,
    state,
    savedAt: Date.now(),
    speakerConfig: globalSpeakerConfig || undefined,
    // 保存恢复面试需要的关键数据
    elapsedTime,
    currentQuestion: context.currentQuestion,
    currentAnswer: currentAnswer, // 优先使用状态机数据，备用 UI 数据
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    logger.error(`[TrainingManager] 持久化失败: ${error}`);
  }
}

/**
 * 清除持久化数据
 */
function clearPersistedData() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    logger.error(`[TrainingManager] 清除持久化数据失败: ${error}`);
  }
}

/**
 * 启动面试训练
 */
export function startInterviewTraining(context: Partial<TrainingContext>): TrainingStateMachine {
  if (globalStateMachine) {
    stopInterviewTraining();
  }

  globalStateMachine = new TrainingStateMachine(context);

  globalStateMachine.onStateChange((state, ctx) => {
    broadcastStateUpdate(state, ctx);
    subscribers.forEach((callback) => callback(state, ctx));
    schedulePersist();

    // 关键状态立即持久化
    if (
      state === TrainingState.LISTENING_INTERVIEWER ||
      state === TrainingState.GENERATING_ANSWER ||
      state === TrainingState.USER_LISTENING ||
      state === TrainingState.USER_SPEAKING
    ) {
      persistCurrentState();
    }
  });

  initSyncChannel();

  return globalStateMachine;
}

/**
 * 停止面试训练
 */
export function stopInterviewTraining() {
  if (globalStateMachine) {
    globalStateMachine.reset();
    globalStateMachine = null;

    clearPersistedData();

    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
  }

  // 停止扬声器控制器
  if (globalSpeakerController) {
    if (typeof globalSpeakerController.stop === 'function') {
      globalSpeakerController.stop().catch((e: any) => logger.error(`停止扬声器失败: ${e}`));
    }
    globalSpeakerController = null;
    globalSpeakerConfig = null;
  }
}

/**
 * 获取当前状态机
 */
export function getTrainingStateMachine(): TrainingStateMachine | null {
  return globalStateMachine;
}

/**
 * 设置扬声器控制器
 */
export function setSpeakerController(
  controller: any,
  config: { deviceId: string; sessionId: string },
) {
  globalSpeakerController = controller;
  globalSpeakerConfig = config;

  // 立即持久化（保存扬声器配置）
  persistCurrentState();
}

/**
 * 获取扬声器控制器
 */
export function getSpeakerController(): any {
  return globalSpeakerController;
}

/**
 * 订阅状态变化
 */
export function subscribeInterviewTraining(callback: StateSubscriber): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

/**
 * 处理过期的训练记录（更新数据库状态并清除本地数据）
 */
async function handleExpiredTraining(interviewId: string): Promise<void> {
  try {
    // 更新数据库状态为过期
    await interviewService.updateInterview(interviewId, {
      status: 'interview-training-expired',
      message: '训练记录已过期（超过24小时），自动终止',
    });
  } catch (error) {
    logger.error(`[TrainingManager] 更新过期训练状态失败: ${error}`);
  } finally {
    // 无论数据库更新是否成功，都清除本地数据
    clearPersistedData();
  }
}

/**
 * 检查是否有可恢复的训练
 */
export function hasRecoverableTraining(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return false;

    const data: PersistedTrainingData = JSON.parse(saved);

    const age = Date.now() - data.savedAt;
    if (age > MAX_AGE) {
      // 异步处理过期训练（更新数据库状态）
      handleExpiredTraining(data.interviewId);
      return false;
    }

    if (data.state === TrainingState.COMPLETED || data.state === TrainingState.ERROR) {
      clearPersistedData();
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * 获取可恢复的训练信息
 */
export function getRecoverableTrainingInfo(): PersistedTrainingData | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

/**
 * 从 localStorage 恢复面试训练
 */
export async function restoreInterviewTraining(): Promise<TrainingStateMachine | null> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return null;
    }

    const data: PersistedTrainingData = JSON.parse(saved);

    // 重新创建 context，包含当前问题和答案
    const context: Partial<TrainingContext> = {
      interviewId: data.interviewId,
      jobPosition: data.jobPosition,
      resume: data.resume,
      currentQuestionIndex: data.currentQuestionIndex,
      totalQuestions: data.totalQuestions,
      currentQuestion: data.currentQuestion || '',
      referenceAnswer: data.currentAnswer || '', // 持久化用 currentAnswer，TrainingContext 用 referenceAnswer
    };

    const machine = startInterviewTraining(context);
    machine.restoreState(data.state, context);

    // 恢复扬声器监听配置（实际的扬声器控制器需要组件重新创建）
    if (data.speakerConfig) {
      globalSpeakerConfig = data.speakerConfig;
    }

    return machine;
  } catch (error) {
    logger.error(`[TrainingManager] 恢复失败: ${error}`);
    clearPersistedData();
    return null;
  }
}

/**
 * 清理资源
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

  if (globalSpeakerController) {
    if (typeof globalSpeakerController.stop === 'function') {
      globalSpeakerController.stop().catch((e: any) => logger.error(`停止扬声器失败: ${e}`));
    }
    globalSpeakerController = null;
    globalSpeakerConfig = null;
  }

  subscribers.clear();
}
