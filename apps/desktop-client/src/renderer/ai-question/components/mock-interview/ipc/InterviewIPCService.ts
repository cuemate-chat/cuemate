/**
 * 面试系统跨窗口通信服务
 * 负责协调 AI 问答窗口和控制栏窗口之间的数据同步
 */

import { createLogger } from '../../../../../utils/rendererLogger.js';
import { InterviewState } from '../../shared/state/InterviewStateMachine';
import { VoiceState } from '../../shared/voice/VoiceCoordinator';

const log = createLogger('InterviewIPCService');

// IPC 通信事件类型
export enum InterviewIPCEvents {
  // 面试状态相关
  INTERVIEW_STATE_CHANGED = 'interview:state-changed',
  INTERVIEW_STARTED = 'interview:started',
  INTERVIEW_ENDED = 'interview:ended',
  INTERVIEW_PROGRESS_UPDATED = 'interview:progress-updated',

  // 语音状态相关
  VOICE_STATE_CHANGED = 'interview:voice-state-changed',
  AUDIO_LEVEL_UPDATED = 'interview:audio-level-updated',

  // 问答数据相关
  QUESTION_GENERATED = 'interview:question-generated',
  ANSWER_GENERATED = 'interview:answer-generated',
  USER_RESPONSE_RECORDED = 'interview:user-response-recorded',
  ANALYSIS_COMPLETED = 'interview:analysis-completed',

  // 控制指令
  TOGGLE_AUTO_MODE = 'interview:toggle-auto-mode',
  SKIP_QUESTION = 'interview:skip-question',
  END_INTERVIEW = 'interview:end-interview',

  // 窗口控制
  SHOW_CONTROL_BAR = 'interview:show-control-bar',
  HIDE_CONTROL_BAR = 'interview:hide-control-bar',
  UPDATE_CONTROL_BAR_STATUS = 'interview:update-control-bar-status',

  // 数据同步
  SYNC_INTERVIEW_DATA = 'interview:sync-data',
  REQUEST_CURRENT_STATE = 'interview:request-current-state',
  PROVIDE_CURRENT_STATE = 'interview:provide-current-state',
}

// IPC 数据接口
export interface InterviewStateData {
  state: InterviewState;
  currentQuestion?: string;
  currentAnswer?: string;
  userResponse?: string;
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
  timestamp: number;
}

export interface VoiceStateData {
  state: VoiceState;
  audioLevel: number;
  isAutoMode: boolean;
  isRecording: boolean;
  timestamp: number;
}

export interface QuestionData {
  sequence: number;
  question: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  timestamp: number;
}

export interface AnswerData {
  sequence: number;
  answer: string;
  keyPoints?: string;
  estimatedTime?: number;
  timestamp: number;
}

export interface UserResponseData {
  sequence: number;
  response: string;
  duration: number;
  confidence?: number;
  timestamp: number;
}

export interface AnalysisData {
  sequence: number;
  pros: string;
  cons: string;
  suggestions: string;
  assessment: string;
  score?: number;
  timestamp: number;
}

export interface ControlBarStatusData {
  isVisible: boolean;
  position: { x: number; y: number };
  interviewActive: boolean;
  recordingActive: boolean;
  currentQuestion?: string;
  timeElapsed: number;
}

export class InterviewIPCService {
  private isInitialized = false;
  private eventListeners: Map<string, Array<(data: any) => void>> = new Map();
  private electronAPI: any;

  constructor() {
    this.electronAPI = (window as any).electronAPI?.interview;
    if (!this.electronAPI) {
      log.warn('constructor', 'Electron Interview API 不可用，IPC 服务将被禁用');
      return;
    }
    this.initialize();
  }

  private initialize(): void {
    if (this.isInitialized) return;

    try {
      // 监听所有面试相关的 IPC 事件
      Object.values(InterviewIPCEvents).forEach((event) => {
        this.electronAPI.onInterviewEvent?.(event, (data: any) => {
          this.handleIncomingEvent(event, data);
        });
      });

      // 注册当前窗口
      this.electronAPI.registerWindow?.();

      this.isInitialized = true;
      log.debug('initialize', 'Interview IPC Service 初始化成功');
    } catch (error) {
      log.error('initialize', 'Interview IPC Service 初始化失败', undefined, error);
    }
  }

  private handleIncomingEvent(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          log.error('handleIncomingEvent', `IPC 事件监听器错误 (${event})`, undefined, error);
        }
      });
    }
  }

  // 事件监听器管理
  on(event: InterviewIPCEvents, listener: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  off(event: InterviewIPCEvents, listener: (data: any) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // 发送事件到主进程或其他窗口
  private emit(event: InterviewIPCEvents, data?: any): void {
    if (!this.isInitialized || !this.electronAPI?.sendInterviewEvent) {
      log.warn('emit', `无法发送 IPC 事件 ${event}: 服务未初始化`);
      return;
    }

    try {
      this.electronAPI.sendInterviewEvent(event, data);
    } catch (error) {
      log.error('emit', `发送 IPC 事件失败 (${event})`, undefined, error);
    }
  }

  // 面试状态同步方法
  notifyStateChanged(stateData: InterviewStateData): void {
    this.emit(InterviewIPCEvents.INTERVIEW_STATE_CHANGED, stateData);
  }

  notifyInterviewStarted(interviewId: string, config: any): void {
    this.emit(InterviewIPCEvents.INTERVIEW_STARTED, { interviewId, config, timestamp: Date.now() });
  }

  notifyInterviewEnded(interviewId: string, summary: any): void {
    this.emit(InterviewIPCEvents.INTERVIEW_ENDED, { interviewId, summary, timestamp: Date.now() });
  }

  notifyProgressUpdated(progress: { current: number; total: number; percentage: number }): void {
    this.emit(InterviewIPCEvents.INTERVIEW_PROGRESS_UPDATED, {
      ...progress,
      timestamp: Date.now(),
    });
  }

  // 语音状态同步方法
  notifyVoiceStateChanged(voiceData: VoiceStateData): void {
    this.emit(InterviewIPCEvents.VOICE_STATE_CHANGED, voiceData);
  }

  notifyAudioLevelUpdated(level: number): void {
    this.emit(InterviewIPCEvents.AUDIO_LEVEL_UPDATED, { level, timestamp: Date.now() });
  }

  // 问答数据同步方法
  notifyQuestionGenerated(questionData: QuestionData): void {
    this.emit(InterviewIPCEvents.QUESTION_GENERATED, questionData);
  }

  notifyAnswerGenerated(answerData: AnswerData): void {
    this.emit(InterviewIPCEvents.ANSWER_GENERATED, answerData);
  }

  notifyUserResponseRecorded(responseData: UserResponseData): void {
    this.emit(InterviewIPCEvents.USER_RESPONSE_RECORDED, responseData);
  }

  notifyAnalysisCompleted(analysisData: AnalysisData): void {
    this.emit(InterviewIPCEvents.ANALYSIS_COMPLETED, analysisData);
  }

  // 控制指令发送方法
  requestToggleAutoMode(autoMode: boolean): void {
    this.emit(InterviewIPCEvents.TOGGLE_AUTO_MODE, { autoMode, timestamp: Date.now() });
  }

  requestSkipQuestion(): void {
    this.emit(InterviewIPCEvents.SKIP_QUESTION, { timestamp: Date.now() });
  }

  requestEndInterview(): void {
    this.emit(InterviewIPCEvents.END_INTERVIEW, { timestamp: Date.now() });
  }

  // 控制栏窗口管理
  showControlBar(): void {
    this.emit(InterviewIPCEvents.SHOW_CONTROL_BAR);
  }

  hideControlBar(): void {
    this.emit(InterviewIPCEvents.HIDE_CONTROL_BAR);
  }

  updateControlBarStatus(statusData: ControlBarStatusData): void {
    this.emit(InterviewIPCEvents.UPDATE_CONTROL_BAR_STATUS, statusData);
  }

  // 数据同步方法
  requestCurrentState(): void {
    this.emit(InterviewIPCEvents.REQUEST_CURRENT_STATE, { timestamp: Date.now() });
  }

  provideCurrentState(stateData: any): void {
    this.emit(InterviewIPCEvents.PROVIDE_CURRENT_STATE, { ...stateData, timestamp: Date.now() });
  }

  syncInterviewData(data: any): void {
    this.emit(InterviewIPCEvents.SYNC_INTERVIEW_DATA, { ...data, timestamp: Date.now() });
  }

  // 工具方法
  isAvailable(): boolean {
    return this.isInitialized && !!this.electronAPI;
  }

  getListenerCount(event: InterviewIPCEvents): number {
    return this.eventListeners.get(event)?.length || 0;
  }

  clearAllListeners(): void {
    this.eventListeners.clear();
  }

  // 健康检查
  async ping(): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      // 发送 ping 事件并等待响应
      return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(false), 1000);

        const pingListener = () => {
          clearTimeout(timeout);
          this.off(InterviewIPCEvents.PROVIDE_CURRENT_STATE, pingListener);
          resolve(true);
        };

        this.on(InterviewIPCEvents.PROVIDE_CURRENT_STATE, pingListener);
        this.requestCurrentState();
      });
    } catch (error) {
      log.error('ping', 'IPC ping 失败', undefined, error);
      return false;
    }
  }

  // 销毁服务
  destroy(): void {
    // 注销窗口
    this.electronAPI?.unregisterWindow?.();
    this.clearAllListeners();
    this.isInitialized = false;
    log.debug('destroy', 'Interview IPC Service 已销毁');
  }
}

// 单例实例
export const interviewIPCService = new InterviewIPCService();
