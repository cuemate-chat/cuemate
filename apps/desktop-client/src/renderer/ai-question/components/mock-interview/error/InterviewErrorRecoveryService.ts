/**
 * 面试错误恢复服务
 * 专门处理面试流程中的错误恢复和状态同步
 */

import { ErrorHandler, ErrorType, ErrorSeverity, ErrorInfo } from './ErrorHandler';
import { RetryManager } from './RetryManager';
import { InterviewState } from '../state/InterviewStateMachine';
import { VoiceState } from '../voice/VoiceCoordinator';

export interface RecoveryConfig {
  enableAutoRecovery: boolean;
  maxRecoveryAttempts: number;
  recoveryDelay: number;
  fallbackToTextMode: boolean;
  preserveInterviewProgress: boolean;
  logRecoveryActions: boolean;
}

export interface RecoveryContext {
  interviewState: InterviewState;
  voiceState: VoiceState;
  currentQuestion?: string;
  currentAnswer?: string;
  progress: { current: number; total: number };
  timestamp: number;
}

export interface RecoveryAction {
  type: 'retry' | 'fallback' | 'skip' | 'reset' | 'abort';
  description: string;
  execute: () => Promise<void>;
  rollback?: () => Promise<void>;
  priority: number;
}

export class InterviewErrorRecoveryService extends EventTarget {
  private errorHandler: ErrorHandler;
  private retryManager: RetryManager;
  private _recoveryConfig: RecoveryConfig;
  private recoveryContext: RecoveryContext | null = null;
  private recoveryInProgress = false;

  // 默认恢复配置
  static readonly DEFAULT_CONFIG: RecoveryConfig = {
    enableAutoRecovery: true,
    maxRecoveryAttempts: 3,
    recoveryDelay: 2000,
    fallbackToTextMode: true,
    preserveInterviewProgress: true,
    logRecoveryActions: true
  };

  constructor(config: Partial<RecoveryConfig> = {}) {
    super();

    this._recoveryConfig = {
      ...InterviewErrorRecoveryService.DEFAULT_CONFIG,
      ...config
    };

    this.errorHandler = new ErrorHandler();
    this.retryManager = new RetryManager();

    this.setupErrorHandling();
  }

  // 设置错误处理监听
  private setupErrorHandling(): void {
    this.errorHandler.addEventListener('error', ((event: CustomEvent) => {
      const { errorInfo } = event.detail;
      this.handleInterviewError(errorInfo);
    }) as EventListener);
  }

  // 设置恢复上下文
  setRecoveryContext(context: RecoveryContext): void {
    this.recoveryContext = { ...context };
  }

  // 更新恢复上下文
  updateRecoveryContext(updates: Partial<RecoveryContext>): void {
    if (this.recoveryContext) {
      this.recoveryContext = { ...this.recoveryContext, ...updates };
    }
  }

  // 处理面试错误
  private async handleInterviewError(errorInfo: ErrorInfo): Promise<void> {
    if (this.recoveryInProgress) {
      console.warn('Recovery already in progress, skipping new error');
      return;
    }

    this.recoveryInProgress = true;

    try {
      const recoveryActions = this.generateRecoveryActions(errorInfo);

      if (recoveryActions.length === 0) {
        this.dispatchEvent(new CustomEvent('noRecoveryAvailable', { detail: errorInfo }));
        return;
      }

      // 按优先级排序
      recoveryActions.sort((a, b) => b.priority - a.priority);

      // 尝试恢复
      const success = await this.executeRecoveryActions(recoveryActions, errorInfo);

      if (success) {
        this.dispatchEvent(new CustomEvent('recoverySuccessful', {
          detail: { errorInfo, actions: recoveryActions }
        }));
      } else {
        this.dispatchEvent(new CustomEvent('recoveryFailed', {
          detail: { errorInfo, actions: recoveryActions }
        }));
      }
    } finally {
      this.recoveryInProgress = false;
    }
  }

  // 生成恢复操作
  private generateRecoveryActions(errorInfo: ErrorInfo): RecoveryAction[] {
    const actions: RecoveryAction[] = [];

    switch (errorInfo.type) {
      case ErrorType.MICROPHONE_ACCESS_DENIED:
        actions.push(
          this.createMicrophoneRecoveryAction(),
          this.createFallbackToTextAction()
        );
        break;

      case ErrorType.ASR_CONNECTION_FAILED:
        actions.push(
          this.createASRRetryAction(),
          this.createFallbackToTextAction()
        );
        break;

      case ErrorType.TTS_SERVICE_UNAVAILABLE:
        actions.push(
          this.createTTSRetryAction(),
          this.createSilentModeAction()
        );
        break;

      case ErrorType.QUESTION_GENERATION_FAILED:
        actions.push(
          this.createQuestionRetryAction(),
          this.createQuestionSkipAction(),
          this.createFallbackQuestionAction()
        );
        break;

      case ErrorType.ANSWER_ANALYSIS_FAILED:
        actions.push(
          this.createAnalysisRetryAction(),
          this.createSkipAnalysisAction()
        );
        break;

      case ErrorType.NETWORK_CONNECTION_FAILED:
        actions.push(
          this.createNetworkRetryAction(),
          this.createOfflineModeAction()
        );
        break;

      case ErrorType.INTERVIEW_STATE_ERROR:
        actions.push(
          this.createStateResetAction(),
          this.createStateSyncAction()
        );
        break;

      default:
        actions.push(this.createGenericRecoveryAction());
        break;
    }

    return actions;
  }

  // 执行恢复操作
  private async executeRecoveryActions(
    actions: RecoveryAction[],
    errorInfo: ErrorInfo
  ): Promise<boolean> {
    for (const action of actions) {
      try {
        this.dispatchEvent(new CustomEvent('recoveryActionStarted', {
          detail: { action, errorInfo }
        }));

        await action.execute();

        this.dispatchEvent(new CustomEvent('recoveryActionCompleted', {
          detail: { action, errorInfo }
        }));

        return true; // 成功恢复
      } catch (error) {
        console.error(`Recovery action failed: ${action.description}`, error);

        // 尝试回滚
        if (action.rollback) {
          try {
            await action.rollback();
          } catch (rollbackError) {
            console.error('Rollback failed:', rollbackError);
          }
        }

        this.dispatchEvent(new CustomEvent('recoveryActionFailed', {
          detail: { action, error, errorInfo }
        }));
      }
    }

    return false; // 所有恢复操作都失败
  }

  // 创建具体的恢复操作

  private createMicrophoneRecoveryAction(): RecoveryAction {
    return {
      type: 'retry',
      description: '重新申请麦克风权限',
      priority: 9,
      execute: async () => {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        this.dispatchEvent(new CustomEvent('microphoneRecovered'));
      }
    };
  }

  private createASRRetryAction(): RecoveryAction {
    return {
      type: 'retry',
      description: '重新连接ASR服务',
      priority: 8,
      execute: async () => {
        await this.retryManager.retry(
          'asr_connection',
          async () => {
            this.dispatchEvent(new CustomEvent('retryASRConnection'));
            return new Promise(resolve => setTimeout(resolve, 1000));
          },
          RetryManager.CONFIGS.AUDIO
        );
      }
    };
  }

  private createTTSRetryAction(): RecoveryAction {
    return {
      type: 'retry',
      description: '重新连接TTS服务',
      priority: 7,
      execute: async () => {
        this.dispatchEvent(new CustomEvent('retryTTSConnection'));
      }
    };
  }

  private createQuestionRetryAction(): RecoveryAction {
    return {
      type: 'retry',
      description: '重新生成问题',
      priority: 8,
      execute: async () => {
        await this.retryManager.retry(
          'question_generation',
          async () => {
            this.dispatchEvent(new CustomEvent('regenerateQuestion'));
            return new Promise(resolve => setTimeout(resolve, 2000));
          },
          RetryManager.CONFIGS.NETWORK
        );
      }
    };
  }

  private createAnalysisRetryAction(): RecoveryAction {
    return {
      type: 'retry',
      description: '重新分析答案',
      priority: 6,
      execute: async () => {
        this.dispatchEvent(new CustomEvent('retryAnswerAnalysis'));
      }
    };
  }

  private createNetworkRetryAction(): RecoveryAction {
    return {
      type: 'retry',
      description: '重新连接网络',
      priority: 7,
      execute: async () => {
        await this.retryManager.retry(
          'network_connection',
          async () => {
            this.dispatchEvent(new CustomEvent('retryNetworkConnection'));
            return new Promise(resolve => setTimeout(resolve, 1000));
          },
          RetryManager.CONFIGS.NETWORK
        );
      }
    };
  }

  private createFallbackToTextAction(): RecoveryAction {
    return {
      type: 'fallback',
      description: '切换到文字输入模式',
      priority: 5,
      execute: async () => {
        this.dispatchEvent(new CustomEvent('switchToTextMode'));
      }
    };
  }

  private createSilentModeAction(): RecoveryAction {
    return {
      type: 'fallback',
      description: '切换到静音模式',
      priority: 4,
      execute: async () => {
        this.dispatchEvent(new CustomEvent('switchToSilentMode'));
      }
    };
  }

  private createQuestionSkipAction(): RecoveryAction {
    return {
      type: 'skip',
      description: '跳过当前问题',
      priority: 3,
      execute: async () => {
        this.dispatchEvent(new CustomEvent('skipCurrentQuestion'));
      }
    };
  }

  private createSkipAnalysisAction(): RecoveryAction {
    return {
      type: 'skip',
      description: '跳过答案分析',
      priority: 3,
      execute: async () => {
        this.dispatchEvent(new CustomEvent('skipAnswerAnalysis'));
      }
    };
  }

  private createFallbackQuestionAction(): RecoveryAction {
    return {
      type: 'fallback',
      description: '使用备用问题',
      priority: 4,
      execute: async () => {
        this.dispatchEvent(new CustomEvent('useFallbackQuestion'));
      }
    };
  }

  private createOfflineModeAction(): RecoveryAction {
    return {
      type: 'fallback',
      description: '切换到离线模式',
      priority: 2,
      execute: async () => {
        this.dispatchEvent(new CustomEvent('switchToOfflineMode'));
      }
    };
  }

  private createStateResetAction(): RecoveryAction {
    return {
      type: 'reset',
      description: '重置面试状态',
      priority: 6,
      execute: async () => {
        if (this.recoveryContext) {
          this.dispatchEvent(new CustomEvent('resetInterviewState', {
            detail: this.recoveryContext
          }));
        }
      }
    };
  }

  private createStateSyncAction(): RecoveryAction {
    return {
      type: 'retry',
      description: '同步面试状态',
      priority: 5,
      execute: async () => {
        this.dispatchEvent(new CustomEvent('syncInterviewState'));
      }
    };
  }

  private createGenericRecoveryAction(): RecoveryAction {
    return {
      type: 'fallback',
      description: '尝试通用恢复',
      priority: 1,
      execute: async () => {
        this.dispatchEvent(new CustomEvent('genericRecovery'));
      }
    };
  }

  // 手动触发恢复
  async triggerRecovery(errorType: ErrorType, context?: RecoveryContext): Promise<boolean> {
    if (context) {
      this.setRecoveryContext(context);
    }

    const errorInfo: ErrorInfo = {
      type: errorType,
      severity: ErrorSeverity.MEDIUM,
      message: 'Manual recovery triggered',
      timestamp: Date.now()
    };

    await this.handleInterviewError(errorInfo);
    return !this.recoveryInProgress;
  }

  // 检查是否可以恢复
  canRecover(errorType: ErrorType): boolean {
    return this.generateRecoveryActions({
      type: errorType,
      severity: ErrorSeverity.MEDIUM,
      message: 'Test',
      timestamp: Date.now()
    }).length > 0;
  }

  // 获取恢复状态
  getRecoveryStatus(): {
    inProgress: boolean;
    context: RecoveryContext | null;
    retryStates: Map<string, any>;
  } {
    return {
      inProgress: this.recoveryInProgress,
      context: this.recoveryContext,
      retryStates: this.retryManager.getAllRetryStates()
    };
  }

  // 停止所有恢复操作
  stopAllRecovery(): void {
    this.recoveryInProgress = false;
    this.retryManager.clearAllRetryStates();
    this.dispatchEvent(new CustomEvent('recoveryAborted'));
  }

  // 获取错误处理器
  getErrorHandler(): ErrorHandler {
    return this.errorHandler;
  }

  // 获取重试管理器
  getRetryManager(): RetryManager {
    return this.retryManager;
  }

  // 获取恢复配置
  getRecoveryConfig(): RecoveryConfig {
    return { ...this._recoveryConfig };
  }

  // 更新恢复配置
  updateRecoveryConfig(updates: Partial<RecoveryConfig>): void {
    this._recoveryConfig = { ...this._recoveryConfig, ...updates };
  }

  // 销毁服务
  destroy(): void {
    this.stopAllRecovery();
    this.errorHandler.destroy();
    this.retryManager.destroy();
  }
}