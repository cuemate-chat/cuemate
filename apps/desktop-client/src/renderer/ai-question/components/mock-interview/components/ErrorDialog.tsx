/**
 * 错误对话框组件
 * 显示错误信息和提供恢复操作选项
 */

import { AlertTriangle, X, RefreshCw, Info, AlertCircle, XCircle } from 'lucide-react';
import { ErrorInfo, ErrorSeverity, RecoveryAction } from '../error/ErrorHandler';

interface ErrorDialogProps {
  isVisible: boolean;
  error: ErrorInfo | null;
  recoveryActions: RecoveryAction[];
  onRecoveryAction: (action: RecoveryAction) => void;
  onClose: () => void;
  className?: string;
}

export function ErrorDialog({
  isVisible,
  error,
  recoveryActions,
  onRecoveryAction,
  onClose,
  className = ''
}: ErrorDialogProps) {
  if (!isVisible || !error) {
    return null;
  }

  // 根据错误严重程度获取图标和样式
  const getSeverityIcon = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return <XCircle className="text-red-500" size={24} />;
      case ErrorSeverity.HIGH:
        return <AlertCircle className="text-orange-500" size={24} />;
      case ErrorSeverity.MEDIUM:
        return <AlertTriangle className="text-yellow-500" size={24} />;
      case ErrorSeverity.LOW:
        return <Info className="text-blue-500" size={24} />;
      default:
        return <AlertTriangle className="text-gray-500" size={24} />;
    }
  };

  const getSeverityColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 'border-red-500 bg-red-50';
      case ErrorSeverity.HIGH:
        return 'border-orange-500 bg-orange-50';
      case ErrorSeverity.MEDIUM:
        return 'border-yellow-500 bg-yellow-50';
      case ErrorSeverity.LOW:
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  };

  const getSeverityText = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return '严重错误';
      case ErrorSeverity.HIGH:
        return '重要错误';
      case ErrorSeverity.MEDIUM:
        return '一般错误';
      case ErrorSeverity.LOW:
        return '轻微错误';
      default:
        return '未知错误';
    }
  };

  const handleRecoveryAction = (action: RecoveryAction) => {
    onRecoveryAction(action);
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className={`error-dialog-overlay ${className}`}>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className={`error-dialog bg-white rounded-lg shadow-xl max-w-md w-full mx-4 border-2 ${getSeverityColor(error.severity)}`}>
          {/* 头部 */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-3">
              {getSeverityIcon(error.severity)}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {getSeverityText(error.severity)}
                </h3>
                <p className="text-sm text-gray-500">
                  {formatTimestamp(error.timestamp)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="关闭"
            >
              <X size={20} />
            </button>
          </div>

          {/* 内容 */}
          <div className="p-4">
            {/* 错误消息 */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">错误描述</h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                {error.message}
              </p>
            </div>

            {/* 错误详情（可选） */}
            {error.details && (
              <div className="mb-4">
                <details className="group">
                  <summary className="text-sm font-medium text-gray-600 cursor-pointer hover:text-gray-800 transition-colors">
                    显示技术详情
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 rounded text-xs text-gray-600 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {error.details}
                  </div>
                </details>
              </div>
            )}

            {/* 恢复操作 */}
            {recoveryActions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">可选操作</h4>
                <div className="space-y-2">
                  {recoveryActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => handleRecoveryAction(action)}
                      className={`
                        w-full px-4 py-2 text-sm font-medium rounded-md transition-colors
                        ${action.isDefault
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }
                      `}
                    >
                      <div className="flex items-center justify-center space-x-2">
                        {action.label.includes('重试') || action.label.includes('重新') ? (
                          <RefreshCw size={16} />
                        ) : null}
                        <span>{action.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 无恢复操作时的提示 */}
            {recoveryActions.length === 0 && (
              <div className="text-center py-2">
                <p className="text-sm text-gray-500">
                  请关闭此对话框继续使用
                </p>
              </div>
            )}
          </div>

          {/* 底部信息 */}
          {error.context && Object.keys(error.context).length > 0 && (
            <div className="px-4 pb-4">
              <details className="group">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                  上下文信息
                </summary>
                <div className="mt-1 text-xs text-gray-600">
                  {Object.entries(error.context).map(([key, value]) => (
                    <div key={key} className="flex">
                      <span className="font-medium">{key}:</span>
                      <span className="ml-1">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 错误列表组件（用于显示错误历史）
interface ErrorListProps {
  errors: ErrorInfo[];
  maxDisplayed?: number;
  onErrorClick?: (error: ErrorInfo) => void;
  className?: string;
}

export function ErrorList({
  errors,
  maxDisplayed = 5,
  onErrorClick,
  className = ''
}: ErrorListProps) {
  const displayedErrors = errors.slice(-maxDisplayed);

  if (displayedErrors.length === 0) {
    return null;
  }

  return (
    <div className={`error-list ${className}`}>
      <div className="bg-white rounded-lg shadow border">
        <div className="px-4 py-3 border-b">
          <h3 className="text-sm font-medium text-gray-900">最近错误</h3>
        </div>
        <div className="divide-y">
          {displayedErrors.map((error, index) => (
            <div
              key={index}
              className={`px-4 py-3 hover:bg-gray-50 transition-colors ${
                onErrorClick ? 'cursor-pointer' : ''
              }`}
              onClick={() => onErrorClick?.(error)}
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {getSeverityIcon(error.severity)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {error.message}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatTimestamp(error.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  function getSeverityIcon(severity: ErrorSeverity) {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return <XCircle className="text-red-500" size={16} />;
      case ErrorSeverity.HIGH:
        return <AlertCircle className="text-orange-500" size={16} />;
      case ErrorSeverity.MEDIUM:
        return <AlertTriangle className="text-yellow-500" size={16} />;
      case ErrorSeverity.LOW:
        return <Info className="text-blue-500" size={16} />;
      default:
        return <AlertTriangle className="text-gray-500" size={16} />;
    }
  }

  function formatTimestamp(timestamp: number) {
    return new Date(timestamp).toLocaleTimeString();
  }
}