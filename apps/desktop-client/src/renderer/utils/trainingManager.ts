// apps/desktop-client/src/renderer/utils/trainingManager.ts

import { logger } from '../../utils/rendererLogger.js';
import { getVoiceState } from '../../utils/voiceState';
import {
  TrainingContext,
  TrainingState,
  TrainingStateMachine,
} from '../ai-question/components/shared/state/TrainingStateMachine';
import { interviewService } from '../interviewer/api/interviewService';

const MAX_AGE = 24 * 60 * 60 * 1000; // 24小时

/**
 * 从持久化文件获取面试训练 ID
 */
export async function getResumingTrainingInterviewId(): Promise<string | null> {
  try {
    const api: any = (window as any).electronInterviewerAPI || (window as any).electronAPI;
    const result = await api?.resumingInterviewIds?.get?.();
    if (result?.success && result.trainingInterviewId) {
      return result.trainingInterviewId;
    }
    return null;
  } catch (error) {
    logger.error(`[TrainingManager] 获取持久化训练 ID 失败: ${error}`);
    return null;
  }
}

/**
 * 全局状态机实例
 */
let globalStateMachine: TrainingStateMachine | null = null;

/**
 * 全局扬声器控制器
 */
let globalSpeakerController: any = null;

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

    // 注意：状态持久化由 InterviewTrainingEntryBody.tsx 的 handleStateChange 负责
    // 它会调用 interviewService.updateInterview() 存入数据库
  });

  initSyncChannel();

  return globalStateMachine;
}

/**
 * 停止面试训练
 */
export function stopInterviewTraining() {
  if (globalStateMachine) {
    globalStateMachine = null;
  }

  // 停止扬声器控制器
  if (globalSpeakerController) {
    if (typeof globalSpeakerController.stop === 'function') {
      globalSpeakerController.stop().catch((e: any) => logger.error(`停止扬声器失败: ${e}`));
    }
    globalSpeakerController = null;
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
  _config: { deviceId: string; sessionId: string },
) {
  globalSpeakerController = controller;
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
 * 处理过期的训练记录（更新数据库状态）
 */
export async function handleExpiredTraining(interviewId: string): Promise<void> {
  try {
    await interviewService.updateInterview(interviewId, {
      status: 'interview-training-expired',
      message: '训练记录已过期（超过24小时），自动终止',
    });
  } catch (error) {
    logger.error(`[TrainingManager] 更新过期训练状态失败: ${error}`);
  }
}

/**
 * 获取数据库中的训练数据
 * @param externalInterviewId 外部传入的面试 ID（可选，如果不传则从 voiceState 获取）
 * @returns 直接返回数据库数据，不做任何转换
 */
export async function validateTrainingWithDatabase(externalInterviewId?: string): Promise<{
  found: boolean;
  interviewId?: string;
  interview?: any;
  error?: boolean; // 标记是否是查询错误（区分"找不到"和"查询失败"）
}> {
  try {
    // 优先使用外部传入的 ID，否则从 voiceState 获取
    let interviewId = externalInterviewId;
    if (!interviewId) {
      const voiceState = getVoiceState();
      interviewId = voiceState.interviewId;
    }

    if (!interviewId) {
      return { found: false };
    }

    // 查询数据库中的训练状态
    const result = await interviewService.getInterview(interviewId);

    // 训练记录不存在
    if (!result || !result.interview) {
      return { found: false, interviewId };
    }

    // 只有训练类型才处理
    if (result.interview.interviewType !== 'training') {
      return { found: false, interviewId };
    }

    // 检查是否过期（24小时）
    const startedAt = result.interview.startedAt;
    if (startedAt) {
      const age = Date.now() - startedAt;
      if (age > MAX_AGE) {
        await handleExpiredTraining(interviewId);
        // 重新查询获取更新后的数据
        const updatedResult = await interviewService.getInterview(interviewId);
        return { found: true, interviewId, interview: updatedResult?.interview };
      }
    }

    // 直接返回数据库数据
    return { found: true, interviewId, interview: result.interview };
  } catch (error) {
    logger.error(`[TrainingManager] 数据库查询失败: ${error}`);
    // 返回 error: true 表示查询失败（非"找不到"），调用方不应该清空 interviewId
    return { found: false, error: true };
  }
}

/**
 * 检查是否有可恢复的训练
 * 从 voiceState 检查是否有 interviewId
 */
export function hasRecoverableTraining(): boolean {
  const voiceState = getVoiceState();
  return !!voiceState.interviewId;
}

/**
 * 从数据库恢复面试训练
 * @param externalInterviewId 外部传入的面试 ID（可选，如果不传则从 voiceState 获取）
 * @param skipStatusCheck 是否跳过状态检查（默认 false，传 true 时无论面试状态如何都恢复数据）
 */
export async function restoreInterviewTraining(
  externalInterviewId?: string,
  skipStatusCheck: boolean = false
): Promise<TrainingStateMachine | null> {
  try {
    // 优先使用外部传入的 ID，否则从 voiceState 获取
    let interviewId = externalInterviewId;
    if (!interviewId) {
      const voiceState = getVoiceState();
      interviewId = voiceState.interviewId;
    }

    if (!interviewId) {
      logger.info('[TrainingManager] 没有可恢复的训练 ID');
      return null;
    }

    // 从数据库获取训练数据
    const result = await interviewService.getInterview(interviewId);

    if (!result || !result.interview) {
      logger.info(`[TrainingManager] 训练记录不存在: ${interviewId}`);
      return null;
    }

    const interview = result.interview;

    // 只恢复训练类型
    if (interview.interviewType !== 'training') {
      logger.info(`[TrainingManager] 不是训练类型: ${interview.interviewType}`);
      return null;
    }

    // 检查状态是否可恢复（如果 skipStatusCheck 为 true 则跳过此检查）
    if (!skipStatusCheck) {
      if (interview.status === 'interview-training-completed' ||
          interview.status === 'interview-training-expired' ||
          interview.status === 'interview-training-error') {
        logger.info(`[TrainingManager] 训练已结束，状态: ${interview.status}`);
        return null;
      }
    }

    // 从数据库数据构建 context
    const context: Partial<TrainingContext> = {
      interviewId: interview.id,
      jobPosition: {
        id: interview.jobId,
        title: interview.jobTitle,
        description: interview.jobContent,
        resumeId: interview.resumesId,
        resumeTitle: interview.resumesTitle,
        resumeContent: interview.resumesContent,
      },
      resume: {
        resumeTitle: interview.resumesTitle,
        resumeContent: interview.resumesContent,
      },
      totalQuestions: interview.questionCount,
      duration: interview.duration || 0,
      // 训练配置
      selectedModelId: interview.selectedModelId,
      status: interview.status,
      interviewState: interview.interviewState,
      interviewType: interview.interviewType,
      locale: interview.locale,
      timezone: interview.timezone,
      theme: interview.theme,
      message: interview.message,
      // 新增字段：设备和模式配置
      answerMode: interview.answerMode,
      microphoneDeviceId: interview.microphoneDeviceId,
      speakerDeviceId: interview.speakerDeviceId,
      // 恢复问题历史
      currentQuestionIndex: result.questions?.length || 0,
      questionsBank: result.questions || [],
      conversationHistory: result.questions?.map((q) => ({
        question: q.askedQuestion || q.question,
        answer: q.candidateAnswer,
        referenceAnswer: q.referenceAnswer,
        assessment: q.assessment,
      })) || [],
    };

    // 创建状态机
    const machine = startInterviewTraining(context);

    // 恢复状态（从数据库的 interviewState 字段）
    if (interview.interviewState) {
      const state = interview.interviewState as TrainingState;
      machine.restoreState(state, context);
    }

    logger.info(`[TrainingManager] 训练恢复成功: ${interviewId}`);
    return machine;
  } catch (error) {
    logger.error(`[TrainingManager] 恢复失败: ${error}`);
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

  if (globalSpeakerController) {
    if (typeof globalSpeakerController.stop === 'function') {
      globalSpeakerController.stop().catch((e: any) => logger.error(`停止扬声器失败: ${e}`));
    }
    globalSpeakerController = null;
  }

  subscribers.clear();
}
