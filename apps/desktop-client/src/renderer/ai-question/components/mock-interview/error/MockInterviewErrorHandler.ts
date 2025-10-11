/**
 * 模拟面试错误处理器
 * 统一处理面试过程中的各种错误和异常恢复
 */

import { InterviewErrorRecoveryService, RecoveryContext } from './InterviewErrorRecoveryService';
import { ErrorHandler, ErrorType, ErrorSeverity, ErrorInfo } from './ErrorHandler';
import { InterviewState } from '../state/InterviewStateMachine';
import { VoiceState } from '../voice/VoiceCoordinator';

export interface MockInterviewErrorConfig {
  enableAutoRecovery: boolean;
  maxRetryAttempts: number;
  retryDelay: number;
  showErrorNotifications: boolean;
  logErrorDetails: boolean;
}

export interface MockInterviewContext {
  interviewState: InterviewState;
  voiceState: VoiceState;
  currentQuestion?: string;
  isAudioReady: boolean;
  isASRConnected: boolean;
  isTTSAvailable: boolean;
}

export class MockInterviewErrorHandler extends EventTarget {
  private errorHandler: ErrorHandler;
  private recoveryService: InterviewErrorRecoveryService;
  private config: MockInterviewErrorConfig;
  private context: MockInterviewContext | null = null;
  private errorCount = 0;
  private lastErrorTime = 0;

  // 默认配置
  static readonly DEFAULT_CONFIG: MockInterviewErrorConfig = {
    enableAutoRecovery: true,
    maxRetryAttempts: 3,
    retryDelay: 2000,
    showErrorNotifications: true,
    logErrorDetails: true
  };

  constructor(config: Partial<MockInterviewErrorConfig> = {}) {
    super();

    this.config = {
      ...MockInterviewErrorHandler.DEFAULT_CONFIG,
      ...config
    };

    this.errorHandler = new ErrorHandler();
    this.recoveryService = new InterviewErrorRecoveryService({
      enableAutoRecovery: this.config.enableAutoRecovery,
      maxRecoveryAttempts: this.config.maxRetryAttempts,
      recoveryDelay: this.config.retryDelay,
      fallbackToTextMode: true,
      preserveInterviewProgress: true,
      logRecoveryActions: this.config.logErrorDetails
    });

    this.setupEventHandlers();
  }

  // 设置事件处理器
  private setupEventHandlers(): void {
    // 监听错误处理器的错误事件
    this.errorHandler.addEventListener('error', ((event: CustomEvent) => {
      const { errorInfo } = event.detail;
      this.handleError(errorInfo);
    }) as EventListener);

    // 监听恢复服务的事件
    this.recoveryService.addEventListener('recoverySuccessful', ((event: CustomEvent) => {
      this.onRecoverySuccessful(event.detail);
    }) as EventListener);

    this.recoveryService.addEventListener('recoveryFailed', ((event: CustomEvent) => {
      this.onRecoveryFailed(event.detail);
    }) as EventListener);

    this.recoveryService.addEventListener('noRecoveryAvailable', ((event: CustomEvent) => {
      this.onNoRecoveryAvailable(event.detail);
    }) as EventListener);
  }

  // 设置面试上下文
  setContext(context: MockInterviewContext): void {
    this.context = { ...context };

    // 更新恢复服务的上下文
    const recoveryContext: RecoveryContext = {
      interviewState: context.interviewState,
      voiceState: context.voiceState,
      currentQuestion: context.currentQuestion,
      progress: { current: 1, total: 10 }, // 默认进度
      timestamp: Date.now()
    };

    this.recoveryService.setRecoveryContext(recoveryContext);
  }

  // 更新面试上下文
  updateContext(updates: Partial<MockInterviewContext>): void {
    if (this.context) {
      this.context = { ...this.context, ...updates };

      // 同步更新恢复服务的上下文
      this.recoveryService.updateRecoveryContext({
        interviewState: this.context.interviewState,
        voiceState: this.context.voiceState,
        currentQuestion: this.context.currentQuestion,
        timestamp: Date.now()
      });
    }
  }

  // 报告错误
  reportError(error: Error | string, type: ErrorType, severity: ErrorSeverity = ErrorSeverity.MEDIUM): void {
    const errorInfo: ErrorInfo = {
      type,
      severity,
      message: error instanceof Error ? error.message : error,
      timestamp: Date.now(),
      context: this.context ? { ...this.context } : undefined
    };

    this.handleError(errorInfo);
  }

  // 处理错误
  private async handleError(errorInfo: ErrorInfo): Promise<void> {
    this.errorCount++;
    this.lastErrorTime = Date.now();

    // 记录错误日志
    if (this.config.logErrorDetails) {
      console.error('Mock Interview Error:', {
        type: errorInfo.type,
        severity: errorInfo.severity,
        message: errorInfo.message,
        context: errorInfo.context,
        timestamp: new Date(errorInfo.timestamp).toISOString()
      });
    }

    // 发送错误事件
    this.dispatchEvent(new CustomEvent('errorOccurred', { detail: errorInfo }));

    // 显示错误通知
    if (this.config.showErrorNotifications) {
      this.showErrorNotification(errorInfo);
    }

    // 如果启用自动恢复，尝试恢复
    if (this.config.enableAutoRecovery) {
      try {
        await this.attemptRecovery(errorInfo);
      } catch (recoveryError) {
        console.error('Error recovery failed:', recoveryError);
        this.dispatchEvent(new CustomEvent('recoveryError', {
          detail: { originalError: errorInfo, recoveryError }
        }));
      }
    }
  }

  // 尝试恢复
  private async attemptRecovery(errorInfo: ErrorInfo): Promise<void> {
    if (!this.context) {
      console.warn('No context available for recovery');
      return;
    }

    // 检查是否超过最大重试次数
    if (this.errorCount > this.config.maxRetryAttempts) {
      this.onMaxRetriesExceeded(errorInfo);
      return;
    }

    // 等待重试延迟
    if (this.config.retryDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
    }

    // 使用恢复服务进行恢复
    const success = await this.recoveryService.triggerRecovery(errorInfo.type, {
      interviewState: this.context.interviewState,
      voiceState: this.context.voiceState,
      currentQuestion: this.context.currentQuestion,
      progress: { current: 1, total: 10 },
      timestamp: Date.now()
    });

    if (!success) {
      console.warn('Recovery attempt failed for error type:', errorInfo.type);
    }
  }

  // 恢复成功处理
  private onRecoverySuccessful(detail: any): void {
    console.debug('Recovery successful:', detail);
    this.errorCount = 0; // 重置错误计数

    this.dispatchEvent(new CustomEvent('recoverySuccessful', { detail }));

    if (this.config.showErrorNotifications) {
      this.showSuccessNotification('问题已自动修复');
    }
  }

  // 恢复失败处理
  private onRecoveryFailed(detail: any): void {
    console.error('Recovery failed:', detail);

    this.dispatchEvent(new CustomEvent('recoveryFailed', { detail }));

    if (this.config.showErrorNotifications) {
      this.showErrorNotification({
        type: ErrorType.RECOVERY_FAILED,
        severity: ErrorSeverity.HIGH,
        message: '自动修复失败，请手动处理',
        timestamp: Date.now()
      });
    }
  }

  // 无恢复方案可用
  private onNoRecoveryAvailable(detail: any): void {
    console.warn('No recovery available for error:', detail);

    this.dispatchEvent(new CustomEvent('noRecoveryAvailable', { detail }));

    if (this.config.showErrorNotifications) {
      this.showErrorNotification({
        type: ErrorType.NO_RECOVERY_AVAILABLE,
        severity: ErrorSeverity.MEDIUM,
        message: '无法自动修复此问题',
        timestamp: Date.now()
      });
    }
  }

  // 超过最大重试次数
  private onMaxRetriesExceeded(errorInfo: ErrorInfo): void {
    console.error('Max retries exceeded for error:', errorInfo);

    this.dispatchEvent(new CustomEvent('maxRetriesExceeded', { detail: errorInfo }));

    if (this.config.showErrorNotifications) {
      this.showErrorNotification({
        type: ErrorType.MAX_RETRIES_EXCEEDED,
        severity: ErrorSeverity.HIGH,
        message: '重试次数已达上限，请检查系统设置',
        timestamp: Date.now()
      });
    }
  }

  // 显示错误通知
  private showErrorNotification(errorInfo: ErrorInfo): void {
    const message = this.getErrorMessage(errorInfo);

    // 发送通知事件，由UI组件负责显示
    this.dispatchEvent(new CustomEvent('showNotification', {
      detail: {
        type: 'error',
        message,
        duration: 5000,
        severity: errorInfo.severity
      }
    }));
  }

  // 显示成功通知
  private showSuccessNotification(message: string): void {
    this.dispatchEvent(new CustomEvent('showNotification', {
      detail: {
        type: 'success',
        message,
        duration: 3000
      }
    }));
  }

  // 获取错误消息
  private getErrorMessage(errorInfo: ErrorInfo): string {
    switch (errorInfo.type) {
      case ErrorType.MICROPHONE_ACCESS_DENIED:
        return '麦克风访问被拒绝，请检查权限设置';
      case ErrorType.ASR_CONNECTION_FAILED:
        return '语音识别服务连接失败，正在尝试重连...';
      case ErrorType.TTS_SERVICE_UNAVAILABLE:
        return 'TTS语音合成服务不可用';
      case ErrorType.QUESTION_GENERATION_FAILED:
        return '问题生成失败，请稍后重试';
      case ErrorType.ANSWER_ANALYSIS_FAILED:
        return '答案分析失败，将跳过本次分析';
      case ErrorType.NETWORK_CONNECTION_FAILED:
        return '网络连接失败，请检查网络设置';
      case ErrorType.INTERVIEW_STATE_ERROR:
        return '面试状态异常，正在重置...';
      default:
        return errorInfo.message || '发生未知错误';
    }
  }

  // 手动恢复
  async manualRecovery(errorType: ErrorType): Promise<boolean> {
    if (!this.context) {
      console.warn('No context available for manual recovery');
      return false;
    }

    return await this.recoveryService.triggerRecovery(errorType, {
      interviewState: this.context.interviewState,
      voiceState: this.context.voiceState,
      currentQuestion: this.context.currentQuestion,
      progress: { current: 1, total: 10 },
      timestamp: Date.now()
    });
  }

  // 重置错误计数
  resetErrorCount(): void {
    this.errorCount = 0;
  }

  // 获取错误统计
  getErrorStats(): {
    totalErrors: number;
    lastErrorTime: number;
    recentErrors: ErrorInfo[];
  } {
    return {
      totalErrors: this.errorCount,
      lastErrorTime: this.lastErrorTime,
      recentErrors: this.errorHandler.errorHistory.slice(-10)
    };
  }

  // 检查系统健康状态
  checkSystemHealth(): {
    isHealthy: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (!this.context) {
      issues.push('面试上下文未设置');
      recommendations.push('请初始化面试上下文');
      return { isHealthy: false, issues, recommendations };
    }

    // 检查音频状态
    if (!this.context.isAudioReady) {
      issues.push('音频服务未就绪');
      recommendations.push('检查麦克风权限和音频设备');
    }

    // 检查ASR连接
    if (!this.context.isASRConnected) {
      issues.push('语音识别服务未连接');
      recommendations.push('检查ASR服务状态和网络连接');
    }

    // 检查TTS可用性
    if (!this.context.isTTSAvailable) {
      issues.push('TTS服务不可用');
      recommendations.push('检查TTS服务配置');
    }

    // 检查错误频率
    const now = Date.now();
    const errorRate = this.errorCount / Math.max((now - this.lastErrorTime) / 60000, 1); // 每分钟错误数
    if (errorRate > 5) {
      issues.push('错误频率过高');
      recommendations.push('检查系统配置和网络稳定性');
    }

    return {
      isHealthy: issues.length === 0,
      issues,
      recommendations
    };
  }

  // 更新配置
  updateConfig(updates: Partial<MockInterviewErrorConfig>): void {
    this.config = { ...this.config, ...updates };

    // 更新恢复服务配置
    this.recoveryService.updateRecoveryConfig({
      enableAutoRecovery: this.config.enableAutoRecovery,
      maxRecoveryAttempts: this.config.maxRetryAttempts,
      recoveryDelay: this.config.retryDelay
    });
  }

  // 销毁处理器
  destroy(): void {
    this.errorHandler.destroy();
    this.recoveryService.destroy();
  }
}