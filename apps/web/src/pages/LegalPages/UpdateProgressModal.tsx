import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { Modal, Progress } from 'antd';
import { useEffect, useState } from 'react';

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
  onRetry?: () => void;
}

export default function UpdateProgressModal({
  open,
  version,
  status,
  progress,
  currentStep,
  error,
  onRetry,
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

  // 定义更新步骤
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
      key: 'installing',
      label: '替换应用文件',
      status: getStepStatus('installing'),
    },
    {
      key: 'pulling-images',
      label: '拉取 Docker 镜像',
      status: getStepStatus('pulling-images'),
    },
  ];

  function getStepStatus(stepKey: string): 'pending' | 'processing' | 'completed' | 'error' {
    const stepOrder = ['downloading', 'extracting', 'installing', 'pulling-images'];
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
        footer={onRetry ? [
          <button
            key="retry"
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            重试
          </button>
        ] : null}
        closable={false}
        maskClosable={false}
      >
        <div className="py-6 text-center">
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
          <div className="text-6xl mb-4">⏱️</div>
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
      footer={null}
      closable={false}
      maskClosable={false}
      width={600}
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

        {/* 提示信息 */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            ⚠️ 请勿关闭此窗口,更新过程中可以继续使用应用
          </p>
        </div>
      </div>
    </Modal>
  );
}
