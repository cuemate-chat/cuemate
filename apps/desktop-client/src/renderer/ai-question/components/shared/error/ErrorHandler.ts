/**
 * 面试系统错误处理管理器
 * 统一处理面试流程中的各种错误和异常情况
 */

export enum ErrorType {
  // 音频相关错误
  AUDIO_INITIALIZATION_FAILED = 'AUDIO_INITIALIZATION_FAILED',
  AUDIO_SERVICE_ERROR = 'AUDIO_SERVICE_ERROR',
  MICROPHONE_ACCESS_DENIED = 'MICROPHONE_ACCESS_DENIED',
  ASR_CONNECTION_FAILED = 'ASR_CONNECTION_FAILED',
  TTS_SERVICE_UNAVAILABLE = 'TTS_SERVICE_UNAVAILABLE',
  AUDIO_PLAYBACK_FAILED = 'AUDIO_PLAYBACK_FAILED',

  // 网络相关错误
  NETWORK_CONNECTION_FAILED = 'NETWORK_CONNECTION_FAILED',
  SERVER_TIMEOUT = 'SERVER_TIMEOUT',
  API_REQUEST_FAILED = 'API_REQUEST_FAILED',

  // 面试流程错误
  INTERVIEW_INITIALIZATION_FAILED = 'INTERVIEW_INITIALIZATION_FAILED',
  QUESTION_GENERATION_FAILED = 'QUESTION_GENERATION_FAILED',
  ANSWER_ANALYSIS_FAILED = 'ANSWER_ANALYSIS_FAILED',
  INTERVIEW_STATE_ERROR = 'INTERVIEW_STATE_ERROR',

  // 数据相关错误
  DATA_PERSISTENCE_FAILED = 'DATA_PERSISTENCE_FAILED',
  DATA_CORRUPTION = 'DATA_CORRUPTION',
  DATABASE_ERROR = 'DATABASE_ERROR',

  // 用户操作错误
  INVALID_USER_INPUT = 'INVALID_USER_INPUT',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  OPERATION_TIMEOUT = 'OPERATION_TIMEOUT',

  // 系统错误
  MEMORY_SHORTAGE = 'MEMORY_SHORTAGE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',

  // 恢复相关错误
  RECOVERY_FAILED = 'RECOVERY_FAILED',
  NO_RECOVERY_AVAILABLE = 'NO_RECOVERY_AVAILABLE',
  MAX_RETRIES_EXCEEDED = 'MAX_RETRIES_EXCEEDED'
}

export enum ErrorSeverity {
  LOW = 'low',        // 不影响核心功能，用户可以继续操作
  MEDIUM = 'medium',  // 影响部分功能，但可以降级处理
  HIGH = 'high',      // 影响核心功能，需要用户干预
  CRITICAL = 'critical' // 严重错误，面试无法继续
}

export interface ErrorInfo {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  details?: string;
  timestamp: number;
  context?: Record<string, any>;
  originalError?: Error;
}

export interface RecoveryAction {
  label: string;
  action: () => Promise<void> | void;
  isDefault?: boolean;
}

export interface ErrorHandlingResult {
  handled: boolean;
  message: string;
  recoveryActions?: RecoveryAction[];
  shouldRetry?: boolean;
  retryDelay?: number;
}

export class ErrorHandler extends EventTarget {
  public errorHistory: ErrorInfo[] = [];
  private maxHistorySize = 100;
  private retryAttempts = new Map<string, number>();
  private maxRetryAttempts = 3;

  constructor() {
    super();
  }

  // 处理错误
  handleError(error: Error | ErrorInfo, context?: Record<string, any>): ErrorHandlingResult {
    const errorInfo = this.normalizeError(error, context);
    this.logError(errorInfo);

    // 根据错误类型和严重程度决定处理策略
    const result = this.processError(errorInfo);

    // 触发错误事件
    this.dispatchEvent(new CustomEvent('error', {
      detail: { errorInfo, result }
    }));

    return result;
  }

  // 标准化错误信息
  private normalizeError(error: Error | ErrorInfo, context?: Record<string, any>): ErrorInfo {
    if (this.isErrorInfo(error)) {
      return {
        ...error,
        context: { ...error.context, ...context },
        timestamp: Date.now()
      };
    }

    // 根据错误消息推断错误类型
    const type = this.inferErrorType(error);
    const severity = this.inferErrorSeverity(type);

    return {
      type,
      severity,
      message: error.message || '未知错误',
      details: error.stack,
      timestamp: Date.now(),
      context,
      originalError: error
    };
  }

  // 判断是否为ErrorInfo对象
  private isErrorInfo(obj: any): obj is ErrorInfo {
    return obj && typeof obj === 'object' && 'type' in obj && 'severity' in obj;
  }

  // 根据错误消息推断错误类型
  private inferErrorType(error: Error): ErrorType {
    const message = error.message.toLowerCase();

    // 音频相关错误
    if (message.includes('microphone') || message.includes('getUserMedia')) {
      return ErrorType.MICROPHONE_ACCESS_DENIED;
    }
    if (message.includes('websocket') || message.includes('asr')) {
      return ErrorType.ASR_CONNECTION_FAILED;
    }
    if (message.includes('tts') || message.includes('speech')) {
      return ErrorType.TTS_SERVICE_UNAVAILABLE;
    }

    // 网络相关错误
    if (message.includes('network') || message.includes('fetch')) {
      return ErrorType.NETWORK_CONNECTION_FAILED;
    }
    if (message.includes('timeout')) {
      return ErrorType.SERVER_TIMEOUT;
    }

    // 面试流程错误
    if (message.includes('interview') || message.includes('question')) {
      return ErrorType.INTERVIEW_INITIALIZATION_FAILED;
    }

    return ErrorType.UNKNOWN_ERROR;
  }

  // 根据错误类型推断严重程度
  private inferErrorSeverity(type: ErrorType): ErrorSeverity {
    switch (type) {
      case ErrorType.MICROPHONE_ACCESS_DENIED:
      case ErrorType.ASR_CONNECTION_FAILED:
      case ErrorType.INTERVIEW_INITIALIZATION_FAILED:
        return ErrorSeverity.CRITICAL;

      case ErrorType.TTS_SERVICE_UNAVAILABLE:
      case ErrorType.QUESTION_GENERATION_FAILED:
      case ErrorType.ANSWER_ANALYSIS_FAILED:
        return ErrorSeverity.HIGH;

      case ErrorType.AUDIO_PLAYBACK_FAILED:
      case ErrorType.API_REQUEST_FAILED:
      case ErrorType.DATA_PERSISTENCE_FAILED:
        return ErrorSeverity.MEDIUM;

      case ErrorType.NETWORK_CONNECTION_FAILED:
      case ErrorType.SERVER_TIMEOUT:
        return ErrorSeverity.MEDIUM;

      default:
        return ErrorSeverity.LOW;
    }
  }

  // 处理具体错误
  private processError(errorInfo: ErrorInfo): ErrorHandlingResult {
    const { type } = errorInfo;

    switch (type) {
      case ErrorType.MICROPHONE_ACCESS_DENIED:
        return this.handleMicrophoneError(errorInfo);

      case ErrorType.ASR_CONNECTION_FAILED:
        return this.handleASRError(errorInfo);

      case ErrorType.TTS_SERVICE_UNAVAILABLE:
        return this.handleTTSError(errorInfo);

      case ErrorType.NETWORK_CONNECTION_FAILED:
      case ErrorType.SERVER_TIMEOUT:
        return this.handleNetworkError(errorInfo);

      case ErrorType.QUESTION_GENERATION_FAILED:
        return this.handleQuestionGenerationError(errorInfo);

      case ErrorType.ANSWER_ANALYSIS_FAILED:
        return this.handleAnswerAnalysisError(errorInfo);

      case ErrorType.INTERVIEW_INITIALIZATION_FAILED:
        return this.handleInterviewInitError(errorInfo);

      default:
        return this.handleGenericError(errorInfo);
    }
  }

  // 处理麦克风权限错误
  private handleMicrophoneError(_errorInfo: ErrorInfo): ErrorHandlingResult {
    return {
      handled: true,
      message: '无法访问麦克风，请检查浏览器权限设置',
      recoveryActions: [
        {
          label: '重新申请权限',
          action: async () => {
            try {
              await navigator.mediaDevices.getUserMedia({ audio: true });
              this.dispatchEvent(new CustomEvent('microphonePermissionGranted'));
            } catch (error) {
              console.error('重新申请麦克风权限失败:', error);
            }
          },
          isDefault: true
        },
        {
          label: '使用键盘输入模式',
          action: () => {
            this.dispatchEvent(new CustomEvent('switchToKeyboardInput'));
          }
        }
      ]
    };
  }

  // 处理ASR连接错误
  private handleASRError(_errorInfo: ErrorInfo): ErrorHandlingResult {
    const retryKey = 'asr_connection';
    const attempts = this.retryAttempts.get(retryKey) || 0;

    if (attempts < this.maxRetryAttempts) {
      this.retryAttempts.set(retryKey, attempts + 1);
      return {
        handled: true,
        message: `ASR服务连接失败，正在重试 (${attempts + 1}/${this.maxRetryAttempts})`,
        shouldRetry: true,
        retryDelay: Math.min(1000 * Math.pow(2, attempts), 5000) // 指数退避
      };
    }

    return {
      handled: true,
      message: 'ASR语音识别服务不可用，请检查服务状态或使用文字输入',
      recoveryActions: [
        {
          label: '重新连接ASR服务',
          action: () => {
            this.retryAttempts.delete(retryKey);
            this.dispatchEvent(new CustomEvent('retryASRConnection'));
          },
          isDefault: true
        },
        {
          label: '切换到文字输入',
          action: () => {
            this.dispatchEvent(new CustomEvent('switchToTextInput'));
          }
        }
      ]
    };
  }

  // 处理TTS错误
  private handleTTSError(_errorInfo: ErrorInfo): ErrorHandlingResult {
    return {
      handled: true,
      message: 'TTS语音合成服务不可用，将使用文字显示',
      recoveryActions: [
        {
          label: '重试TTS服务',
          action: () => {
            this.dispatchEvent(new CustomEvent('retryTTS'));
          }
        },
        {
          label: '继续文字模式',
          action: () => {
            this.dispatchEvent(new CustomEvent('continueTextMode'));
          },
          isDefault: true
        }
      ]
    };
  }

  // 处理网络错误
  private handleNetworkError(_errorInfo: ErrorInfo): ErrorHandlingResult {
    const retryKey = 'network_request';
    const attempts = this.retryAttempts.get(retryKey) || 0;

    if (attempts < this.maxRetryAttempts) {
      this.retryAttempts.set(retryKey, attempts + 1);
      return {
        handled: true,
        message: `网络连接失败，正在重试 (${attempts + 1}/${this.maxRetryAttempts})`,
        shouldRetry: true,
        retryDelay: 2000 + attempts * 1000
      };
    }

    return {
      handled: true,
      message: '网络连接失败，请检查网络设置',
      recoveryActions: [
        {
          label: '重试网络连接',
          action: () => {
            this.retryAttempts.delete(retryKey);
            this.dispatchEvent(new CustomEvent('retryNetwork'));
          },
          isDefault: true
        },
        {
          label: '离线模式',
          action: () => {
            this.dispatchEvent(new CustomEvent('switchToOfflineMode'));
          }
        }
      ]
    };
  }

  // 处理问题生成错误
  private handleQuestionGenerationError(_errorInfo: ErrorInfo): ErrorHandlingResult {
    return {
      handled: true,
      message: '生成面试问题失败',
      recoveryActions: [
        {
          label: '重新生成问题',
          action: () => {
            this.dispatchEvent(new CustomEvent('regenerateQuestion'));
          },
          isDefault: true
        },
        {
          label: '跳过当前问题',
          action: () => {
            this.dispatchEvent(new CustomEvent('skipQuestion'));
          }
        },
        {
          label: '结束面试',
          action: () => {
            this.dispatchEvent(new CustomEvent('endInterview'));
          }
        }
      ]
    };
  }

  // 处理答案分析错误
  private handleAnswerAnalysisError(_errorInfo: ErrorInfo): ErrorHandlingResult {
    return {
      handled: true,
      message: '分析回答失败，将保存原始回答',
      recoveryActions: [
        {
          label: '重新分析',
          action: () => {
            this.dispatchEvent(new CustomEvent('retryAnalysis'));
          }
        },
        {
          label: '继续下一题',
          action: () => {
            this.dispatchEvent(new CustomEvent('continueNext'));
          },
          isDefault: true
        }
      ]
    };
  }

  // 处理面试初始化错误
  private handleInterviewInitError(_errorInfo: ErrorInfo): ErrorHandlingResult {
    return {
      handled: true,
      message: '面试初始化失败，请检查系统设置',
      recoveryActions: [
        {
          label: '重新初始化',
          action: () => {
            this.dispatchEvent(new CustomEvent('retryInterviewInit'));
          },
          isDefault: true
        },
        {
          label: '退出面试',
          action: () => {
            this.dispatchEvent(new CustomEvent('exitInterview'));
          }
        }
      ]
    };
  }

  // 处理通用错误
  private handleGenericError(errorInfo: ErrorInfo): ErrorHandlingResult {
    if (errorInfo.severity === ErrorSeverity.CRITICAL) {
      return {
        handled: true,
        message: '发生严重错误，面试无法继续',
        recoveryActions: [
          {
            label: '重新启动',
            action: () => {
              this.dispatchEvent(new CustomEvent('restart'));
            },
            isDefault: true
          }
        ]
      };
    }

    return {
      handled: true,
      message: errorInfo.message || '发生未知错误',
      recoveryActions: [
        {
          label: '继续',
          action: () => {
            this.dispatchEvent(new CustomEvent('continue'));
          },
          isDefault: true
        }
      ]
    };
  }

  // 记录错误
  private logError(errorInfo: ErrorInfo): void {
    console.error('[ErrorHandler]', errorInfo);

    // 添加到错误历史
    this.errorHistory.push(errorInfo);

    // 限制历史记录大小
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }
  }

  // 清除重试计数
  clearRetryAttempts(key?: string): void {
    if (key) {
      this.retryAttempts.delete(key);
    } else {
      this.retryAttempts.clear();
    }
  }

  // 获取错误历史
  getErrorHistory(): ErrorInfo[] {
    return [...this.errorHistory];
  }

  // 获取错误统计
  getErrorStats(): { [key in ErrorType]?: number } {
    const stats: { [key in ErrorType]?: number } = {};

    this.errorHistory.forEach(error => {
      stats[error.type] = (stats[error.type] || 0) + 1;
    });

    return stats;
  }

  // 检查是否有关键错误
  hasCriticalErrors(): boolean {
    return this.errorHistory.some(error => error.severity === ErrorSeverity.CRITICAL);
  }

  // 清除错误历史
  clearErrorHistory(): void {
    this.errorHistory = [];
  }

  // 销毁
  destroy(): void {
    this.clearErrorHistory();
    this.retryAttempts.clear();
  }
}