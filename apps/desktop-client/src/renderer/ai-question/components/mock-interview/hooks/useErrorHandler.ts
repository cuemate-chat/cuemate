/**
 * 错误处理React Hook
 * 在面试组件中统一处理错误和异常恢复
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ErrorHandler,
  ErrorInfo,
  ErrorHandlingResult,
  RecoveryAction,
  ErrorSeverity
} from '../error/ErrorHandler';

interface ErrorState {
  currentError: ErrorInfo | null;
  isErrorDialogVisible: boolean;
  recoveryActions: RecoveryAction[];
  errorHistory: ErrorInfo[];
  hasUnhandledErrors: boolean;
}

interface UseErrorHandlerOptions {
  autoShowDialog?: boolean;
  maxDisplayedErrors?: number;
  onErrorHandled?: (error: ErrorInfo, result: ErrorHandlingResult) => void;
  onRecoveryAction?: (action: RecoveryAction) => void;
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const {
    autoShowDialog = true,
    maxDisplayedErrors = 5,
    onErrorHandled,
    onRecoveryAction
  } = options;

  const errorHandlerRef = useRef<ErrorHandler | null>(null);
  const [errorState, setErrorState] = useState<ErrorState>({
    currentError: null,
    isErrorDialogVisible: false,
    recoveryActions: [],
    errorHistory: [],
    hasUnhandledErrors: false
  });

  // 初始化错误处理器
  useEffect(() => {
    if (!errorHandlerRef.current) {
      errorHandlerRef.current = new ErrorHandler();

      // 监听错误事件
      const handleError = ((event: CustomEvent) => {
        const { errorInfo, result } = event.detail;

        setErrorState(prev => ({
          ...prev,
          currentError: errorInfo,
          isErrorDialogVisible: autoShowDialog && errorInfo.severity !== ErrorSeverity.LOW,
          recoveryActions: result.recoveryActions || [],
          errorHistory: [...prev.errorHistory, errorInfo].slice(-maxDisplayedErrors),
          hasUnhandledErrors: true
        }));

        onErrorHandled?.(errorInfo, result);
      }) as EventListener;

      errorHandlerRef.current.addEventListener('error', handleError);

      // 监听恢复事件
      const recoveryEvents = [
        'microphonePermissionGranted',
        'switchToKeyboardInput',
        'retryASRConnection',
        'switchToTextInput',
        'retryTTS',
        'continueTextMode',
        'retryNetwork',
        'switchToOfflineMode',
        'regenerateQuestion',
        'skipQuestion',
        'endInterview',
        'retryAnalysis',
        'continueNext',
        'retryInterviewInit',
        'exitInterview',
        'restart',
        'continue'
      ];

      const recoveryHandlers: Array<() => void> = [];

      recoveryEvents.forEach(eventType => {
        const handler = (() => {
          setErrorState(prev => ({
            ...prev,
            hasUnhandledErrors: false
          }));
        });

        errorHandlerRef.current!.addEventListener(eventType, handler);
        recoveryHandlers.push(() => {
          errorHandlerRef.current?.removeEventListener(eventType, handler);
        });
      });

      return () => {
        errorHandlerRef.current?.removeEventListener('error', handleError);
        recoveryHandlers.forEach(cleanup => cleanup());
        errorHandlerRef.current?.destroy();
        errorHandlerRef.current = null;
      };
    }
  }, [autoShowDialog, maxDisplayedErrors, onErrorHandled]);

  // 处理错误
  const handleError = useCallback((error: Error | ErrorInfo, context?: Record<string, any>): ErrorHandlingResult | null => {
    if (!errorHandlerRef.current) {
      console.error('ErrorHandler not initialized');
      return null;
    }

    return errorHandlerRef.current.handleError(error, context);
  }, []);

  // 执行恢复操作
  const executeRecoveryAction = useCallback((action: RecoveryAction) => {
    onRecoveryAction?.(action);

    // 执行恢复操作
    if (typeof action.action === 'function') {
      Promise.resolve(action.action()).catch(error => {
        console.error('Recovery action failed:', error);
        handleError(error, { recoveryActionLabel: action.label });
      });
    }

    // 隐藏错误对话框
    setErrorState(prev => ({
      ...prev,
      isErrorDialogVisible: false,
      currentError: null
    }));
  }, [handleError, onRecoveryAction]);

  // 显示错误对话框
  const showErrorDialog = useCallback((error?: ErrorInfo) => {
    setErrorState(prev => ({
      ...prev,
      isErrorDialogVisible: true,
      currentError: error || prev.currentError
    }));
  }, []);

  // 隐藏错误对话框
  const hideErrorDialog = useCallback(() => {
    setErrorState(prev => ({
      ...prev,
      isErrorDialogVisible: false
    }));
  }, []);

  // 清除错误状态
  const clearError = useCallback(() => {
    setErrorState(prev => ({
      ...prev,
      currentError: null,
      isErrorDialogVisible: false,
      recoveryActions: [],
      hasUnhandledErrors: false
    }));
  }, []);

  // 清除所有错误历史
  const clearErrorHistory = useCallback(() => {
    errorHandlerRef.current?.clearErrorHistory();
    setErrorState(prev => ({
      ...prev,
      errorHistory: []
    }));
  }, []);

  // 清除重试计数
  const clearRetryAttempts = useCallback((key?: string) => {
    errorHandlerRef.current?.clearRetryAttempts(key);
  }, []);

  // 获取错误统计
  const getErrorStats = useCallback(() => {
    return errorHandlerRef.current?.getErrorStats() || {};
  }, []);

  // 检查是否有关键错误
  const hasCriticalErrors = useCallback(() => {
    return errorHandlerRef.current?.hasCriticalErrors() || false;
  }, []);

  // 便捷的错误处理方法
  const handleAudioError = useCallback((error: Error, context?: Record<string, any>) => {
    return handleError(error, { ...context, category: 'audio' });
  }, [handleError]);

  const handleNetworkError = useCallback((error: Error, context?: Record<string, any>) => {
    return handleError(error, { ...context, category: 'network' });
  }, [handleError]);

  const handleInterviewError = useCallback((error: Error, context?: Record<string, any>) => {
    return handleError(error, { ...context, category: 'interview' });
  }, [handleError]);

  // 创建错误边界包装器
  const withErrorBoundary = useCallback(<T extends any[]>(
    fn: (...args: T) => Promise<any> | any,
    context?: Record<string, any>
  ) => {
    return async (...args: T) => {
      try {
        return await fn(...args);
      } catch (error) {
        handleError(error as Error, context);
        throw error; // 重新抛出以保持原有的错误处理流程
      }
    };
  }, [handleError]);

  return {
    // 状态
    ...errorState,

    // 方法
    handleError,
    handleAudioError,
    handleNetworkError,
    handleInterviewError,
    executeRecoveryAction,
    showErrorDialog,
    hideErrorDialog,
    clearError,
    clearErrorHistory,
    clearRetryAttempts,
    getErrorStats,
    hasCriticalErrors,
    withErrorBoundary,

    // 原始错误处理器实例（高级用法）
    errorHandler: errorHandlerRef.current
  };
}