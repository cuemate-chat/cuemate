import { ExclamationCircleOutlined } from '@ant-design/icons';
import { Modal } from 'antd';
import type { VersionInfo } from '../../api/versions';

interface UpdateConfirmModalProps {
  open: boolean;
  version: VersionInfo | null;
  currentVersion: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function UpdateConfirmModal({
  open,
  version,
  currentVersion,
  onConfirm,
  onCancel,
}: UpdateConfirmModalProps) {
  if (!version) return null;

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <ExclamationCircleOutlined className="text-blue-500" />
          <span>确认更新到 {version.version}</span>
        </div>
      }
      open={open}
      onOk={onConfirm}
      onCancel={onCancel}
      okText="确认更新"
      cancelText="取消"
      width={500}
    >
      <div className="space-y-4 py-4">
        {/* 版本信息 */}
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">当前版本:</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{currentVersion}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">目标版本:</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">{version.version}</span>
          </div>
        </div>

        {/* 更新信息 */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            <span className="text-slate-700 dark:text-slate-300">更新包大小: 约 200MB</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
            <span className="text-slate-700 dark:text-slate-300">Docker 镜像: 约 2GB</span>
          </div>
        </div>

        {/* 注意事项 */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ExclamationCircleOutlined className="text-amber-600 dark:text-amber-400 text-lg mt-0.5" />
            <div className="flex-1 space-y-2">
              <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300">注意事项</h4>
              <ul className="text-sm text-amber-700 dark:text-amber-200 space-y-1 list-disc list-inside">
                <li>更新过程约需 5-10 分钟</li>
                <li>更新时可继续使用,完成后会自动重启</li>
                <li>请确保网络连接稳定</li>
                <li>更新前已自动备份数据</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 更新内容预览 */}
        {version.desc && version.desc.length > 0 && (
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">主要更新内容</h4>
            <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
              {version.desc.slice(0, 3).map((desc, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span className="flex-1">{desc}</span>
                </div>
              ))}
              {version.desc.length > 3 && (
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  等共 {version.desc.length} 项更新...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
