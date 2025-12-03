import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Modal, Progress } from 'antd';
import { useEffect, useState } from 'react';
import LogViewer from '../../components/LogViewer';

export type UpdateStatus =
  | 'idle'
  | 'downloading'
  | 'extracting'
  | 'installing'
  | 'pulling-images'
  | 'ready'
  | 'restarting'
  | 'completed'
  | 'error';

interface UpdateStep {
  key: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

interface UpdateProgressModalProps {
  open: boolean;
  version: string;
  status: UpdateStatus;
  progress: number;
  currentStep?: string;
  error?: string;
  logs?: string;
  onRetry?: () => void;
  onClose?: () => void;
}

export default function UpdateProgressModal({
  open,
  version,
  status,
  progress,
  currentStep,
  error,
  logs = '',
  onRetry,
  onClose,
}: UpdateProgressModalProps) {
  const [countdown, setCountdown] = useState(3);

  // 倒计时逻辑
  useEffect(() => {
    if (status === 'ready' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [status, countdown]);

  // 定义更新步骤（先拉取镜像，后替换应用，确保版本一致性）
  const steps: UpdateStep[] = [
    {
      key: 'downloading',
      label: '下载更新包',
      status: getStepStatus('downloading'),
    },
    {
      key: 'extracting',
      label: '解压更新包',
      status: getStepStatus('extracting'),
    },
    {
      key: 'pulling-images',
      label: '拉取 Docker 镜像',
      status: getStepStatus('pulling-images'),
    },
    {
      key: 'installing',
      label: '替换应用文件',
      status: getStepStatus('installing'),
    },
    {
      key: 'ready',
      label: '准备重启',
      status: getStepStatus('ready'),
    },
  ];

  function getStepStatus(stepKey: string): 'pending' | 'processing' | 'completed' | 'error' {
    const stepOrder = ['downloading', 'extracting', 'pulling-images', 'installing', 'ready'];
    const currentIndex = stepOrder.indexOf(status);
    const stepIndex = stepOrder.indexOf(stepKey);

    // 如果当前状态是错误状态
    if (status === 'error') return 'error';

    // 如果当前状态不在步骤列表中（idle, ready, restarting, completed），所有步骤都显示为 pending
    if (currentIndex === -1) return 'pending';

    // 比较当前步骤和目标步骤的位置
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'processing';
    return 'pending';
  }

  // 渲染步骤图标
  function renderStepIcon(stepStatus: 'pending' | 'processing' | 'completed' | 'error') {
    switch (stepStatus) {
      case 'completed':
        return <CheckCircleOutlined className="text-green-500" />;
      case 'processing':
        return <LoadingOutlined className="text-blue-500" />;
      case 'error':
        return <CloseCircleOutlined className="text-red-500" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-slate-300" />;
    }
  }

  // 错误状态
  if (status === 'error') {
    return (
      <Modal
        title="更新失败"
        open={open}
        onCancel={onClose}
        footer={onRetry ? [
          <button
            key="retry"
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            重试
          </button>
        ] : null}
        closable={true}
        maskClosable={false}
        width="70%"
      >
        <div className="py-4 space-y-6">
          <div className="text-center">
            <CloseCircleOutlined className="text-6xl text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              更新过程中发生错误
            </h3>
            {error && (
              <p className="text-sm text-slate-600 dark:text-slate-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3 mt-4">
                {error}
              </p>
            )}
          </div>

          {/* 实时日志输出 */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              实时日志
            </h4>
            <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
              <LogViewer
                title="更新日志"
                logs={logs || '等待更新开始...'}
                loading={false}
                height={200}
              />
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  // 准备完成,即将重启
  if (status === 'ready') {
    return (
      <Modal
        title="更新准备完成"
        open={open}
        footer={null}
        closable={false}
        maskClosable={false}
      >
        <div className="py-8 text-center">
          <ClockIcon className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            {countdown}
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            应用将在 {countdown} 秒后自动重启
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-4">
            重启后将使用 {version} 版本
          </p>
        </div>
      </Modal>
    );
  }

  // 重启中
  if (status === 'restarting') {
    return (
      <Modal
        title="正在重启应用"
        open={open}
        footer={null}
        closable={false}
        maskClosable={false}
      >
        <div className="py-8 text-center">
          <LoadingOutlined className="text-6xl text-blue-500 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
            正在启动新版本...
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            请稍候,页面将自动刷新
          </p>
        </div>
      </Modal>
    );
  }

  // 更新进度
  return (
    <Modal
      title={`正在更新到 ${version}`}
      open={open}
      zIndex={10000}
      footer={null}
      closable={false}
      maskClosable={false}
      width="70%"
    >
      <div className="py-4 space-y-6">
        {/* 总体进度 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              总进度
            </span>
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              {progress}%
            </span>
          </div>
          <Progress
            percent={progress}
            strokeColor={{
              '0%': '#3b82f6',
              '100%': '#10b981',
            }}
            showInfo={false}
          />
        </div>

        {/* 当前步骤提示 */}
        {currentStep && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <LoadingOutlined className="text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {currentStep}
              </span>
            </div>
          </div>
        )}

        {/* 步骤列表 */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            更新步骤
          </h4>
          <div className="space-y-2">
            {steps.map((step) => (
              <div
                key={step.key}
                className={`
                  flex items-center gap-3 p-3 rounded-lg border transition-colors
                  ${step.status === 'processing'
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    : step.status === 'completed'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : step.status === 'error'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }
                `}
              >
                {renderStepIcon(step.status)}
                <span className={`
                  text-sm font-medium
                  ${step.status === 'processing'
                    ? 'text-blue-700 dark:text-blue-300'
                    : step.status === 'completed'
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-slate-600 dark:text-slate-400'
                  }
                `}>
                  {step.label}
                </span>
                {step.status === 'processing' && (
                  <span className="ml-auto text-xs text-blue-600 dark:text-blue-400">
                    进行中...
                  </span>
                )}
                {step.status === 'completed' && (
                  <span className="ml-auto text-xs text-green-600 dark:text-green-400">
                    已完成
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 实时日志输出 */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            实时日志
          </h4>
          <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
            <LogViewer
              title="更新日志"
              logs={logs || '等待更新开始...'}
              loading={false}
              height={200}
            />
          </div>
        </div>

        {/* 提示信息 */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1">
            <ExclamationTriangleIcon className="w-4 h-4" />
            请勿关闭此窗口,更新过程中可以继续使用应用
          </p>
        </div>
      </div>
    </Modal>
  );
}
