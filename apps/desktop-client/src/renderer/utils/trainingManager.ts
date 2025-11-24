// apps/desktop-client/src/renderer/utils/trainingManager.ts

import {
  TrainingContext,
  TrainingState,
  TrainingStateMachine,
} from '../ai-question/components/shared/state/TrainingStateMachine';

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
 */
function persistCurrentState() {
  if (!globalStateMachine) {
    return;
  }

  const context = globalStateMachine.getContext();
  const state = globalStateMachine.getState();

  const data: PersistedTrainingData = {
    interviewId: context.interviewId,
    jobPosition: context.jobPosition,
    resume: context.resume,
    currentQuestionIndex: context.currentQuestionIndex,
    totalQuestions: context.totalQuestions,
    state,
    savedAt: Date.now(),
    speakerConfig: globalSpeakerConfig || undefined,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log('[TrainingManager] 状态已持久化:', state);
  } catch (error) {
    console.error('[TrainingManager] 持久化失败:', error);
  }
}

/**
 * 清除持久化数据
 */
function clearPersistedData() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[TrainingManager] 持久化数据已清除');
  } catch (error) {
    console.error('[TrainingManager] 清除持久化数据失败:', error);
  }
}

/**
 * 启动面试训练
 */
export function startInterviewTraining(context: Partial<TrainingContext>): TrainingStateMachine {
  if (globalStateMachine) {
    console.warn('[TrainingManager] 已存在状态机，先停止');
    stopInterviewTraining();
  }

  globalStateMachine = new TrainingStateMachine(context);

  globalStateMachine.onStateChange((state, ctx) => {
    console.log('[TrainingManager] 状态变化:', state);

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

  console.log('[TrainingManager] 面试训练已启动:', context.interviewId);

  return globalStateMachine;
}

/**
 * 停止面试训练
 */
export function stopInterviewTraining() {
  if (globalStateMachine) {
    console.log('[TrainingManager] 停止面试训练');

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
    console.log('[TrainingManager] 停止扬声器监听');
    if (typeof globalSpeakerController.stop === 'function') {
      globalSpeakerController.stop().catch(console.error);
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

  console.log('[TrainingManager] 扬声器控制器已设置');
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
 * 检查是否有可恢复的训练
 */
export function hasRecoverableTraining(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return false;

    const data: PersistedTrainingData = JSON.parse(saved);

    const age = Date.now() - data.savedAt;
    if (age > MAX_AGE) {
      clearPersistedData();
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
      console.log('[TrainingManager] 没有可恢复的数据');
      return null;
    }

    const data: PersistedTrainingData = JSON.parse(saved);

    console.log('[TrainingManager] 开始恢复面试训练:', data.interviewId);

    const context: Partial<TrainingContext> = {
      interviewId: data.interviewId,
      jobPosition: data.jobPosition,
      resume: data.resume,
      currentQuestionIndex: data.currentQuestionIndex,
      totalQuestions: data.totalQuestions,
    };

    const machine = startInterviewTraining(context);
    machine.restoreState(data.state, context);

    // 恢复扬声器监听配置（实际的扬声器控制器需要组件重新创建）
    if (data.speakerConfig) {
      console.log('[TrainingManager] 需要恢复扬声器监听，配置:', data.speakerConfig);
      globalSpeakerConfig = data.speakerConfig;
    }

    console.log('[TrainingManager] 面试训练恢复成功');

    return machine;
  } catch (error) {
    console.error('[TrainingManager] 恢复失败:', error);
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
      globalSpeakerController.stop().catch(console.error);
    }
    globalSpeakerController = null;
    globalSpeakerConfig = null;
  }

  subscribers.clear();
}
