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
 * 与数据库校验训练状态
 * 从 voiceState 获取 interviewId，然后查询数据库
 * @returns 返回校验后的状态：
 *   - 'valid': 训练未完成，可以恢复
 *   - 'completed': 训练已完成
 *   - 'not_found': 训练记录不存在
 *   - 'no_interview_id': voiceState 中没有 interviewId
 *   - 'expired': 训练已过期
 */
export async function validateTrainingWithDatabase(): Promise<{
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

    // 查询数据库中的训练状态
    const result = await interviewService.getInterview(interviewId);

    // 训练记录不存在（可能已被删除）
    if (!result || !result.interview) {
      logger.info(`[TrainingManager] 训练记录不存在: ${interviewId}`);
      return { status: 'not_found', interviewId };
    }

    const dbStatus = result.interview.status;
    const startedAt = result.interview.started_at;

    // 检查是否过期（24小时）
    if (startedAt) {
      const age = Date.now() - startedAt;
      if (age > MAX_AGE) {
        await handleExpiredTraining(interviewId);
        return { status: 'expired', interviewId, dbStatus };
      }
    }

    // 检查数据库中的状态是否已完成或出错
    if (dbStatus === 'interview-training-completed' || dbStatus === 'interview-training-expired' || dbStatus === 'interview-training-error') {
      return { status: 'completed', interviewId, dbData: result.interview, dbStatus };
    }

    // 只有训练类型才返回 valid
    if (result.interview.interview_type !== 'training') {
      return { status: 'not_found', interviewId };
    }

    // 训练仍在进行中
    return { status: 'valid', interviewId, dbData: result.interview, dbStatus };
  } catch (error) {
    logger.error(`[TrainingManager] 数据库校验失败: ${error}`);
    return { status: 'no_interview_id' };
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
 * 使用 voiceState 中的 interviewId 查询数据库获取完整数据
 */
export async function restoreInterviewTraining(): Promise<TrainingStateMachine | null> {
  try {
    const voiceState = getVoiceState();
    const interviewId = voiceState.interviewId;

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
    if (interview.interview_type !== 'training') {
      logger.info(`[TrainingManager] 不是训练类型: ${interview.interview_type}`);
      return null;
    }

    // 检查状态是否可恢复
    if (interview.status === 'interview-training-completed' ||
        interview.status === 'interview-training-expired' ||
        interview.status === 'interview-training-error') {
      logger.info(`[TrainingManager] 训练已结束，状态: ${interview.status}`);
      return null;
    }

    // 从数据库数据构建 context
    const context: Partial<TrainingContext> = {
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
      // 训练配置
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
    const machine = startInterviewTraining(context);

    // 恢复状态（从数据库的 interview_state 字段）
    if (interview.interview_state) {
      const state = interview.interview_state as TrainingState;
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
