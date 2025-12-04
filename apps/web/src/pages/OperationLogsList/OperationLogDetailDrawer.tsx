import type { OperationLog } from '../../api/operation-logs';
import DrawerProvider, { DrawerContent, DrawerHeader } from '../../components/DrawerProvider';

interface OperationLogDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  logItem: OperationLog | null;
}

export default function OperationLogDetailDrawer({ open, onClose, logItem }: OperationLogDetailDrawerProps) {
  // 获取操作状态标签样式
  const getStatusBadge = (status: string) => {
    const baseClass = 'px-2 py-1 rounded-full text-xs font-medium';
    switch (status) {
      case 'success':
        return `${baseClass} bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300`;
      case 'failed':
        return `${baseClass} bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300`;
      default:
        return `${baseClass} bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200`;
    }
  };

  return (
    <DrawerProvider
      open={open}
      onClose={onClose}
      width="80%"
    >
      <DrawerHeader>
        <span className="font-medium">操作记录详情</span>
      </DrawerHeader>
      
      <DrawerContent>
        {logItem && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <div className="space-y-6">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center py-3 border-b border-gray-100 dark:border-slate-700">
                  <span className="w-28 text-base font-black text-gray-900 dark:text-slate-100 flex-shrink-0">操作菜单</span>
                  <span className="text-sm text-gray-700 dark:text-slate-200">{logItem.menu}</span>
                </div>
                <div className="flex items-center py-3 border-b border-gray-100 dark:border-slate-700">
                  <span className="w-28 text-base font-black text-gray-900 dark:text-slate-100 flex-shrink-0">资源类型</span>
                  <span className="text-sm text-gray-700 dark:text-slate-200">{logItem.type}</span>
                </div>
                <div className="flex items-start py-3 border-b border-gray-100 dark:border-slate-700">
                  <span className="w-28 text-base font-black text-gray-900 dark:text-slate-100 flex-shrink-0 mt-0.5">资源 ID</span>
                  <span className="text-sm text-blue-700 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded break-all">{logItem.resourceId}</span>
                </div>
                <div className="flex items-center py-3 border-b border-gray-100 dark:border-slate-700">
                  <span className="w-28 text-base font-black text-gray-900 dark:text-slate-100 flex-shrink-0">资源名称</span>
                  <span className="text-sm text-gray-700 dark:text-slate-200">{logItem.resourceName}</span>
                </div>
                <div className="flex items-center py-3 border-b border-gray-100 dark:border-slate-700">
                  <span className="w-28 text-base font-black text-gray-900 dark:text-slate-100 flex-shrink-0">操作类型</span>
                  <span className="text-sm text-gray-700 dark:text-slate-200">{logItem.operation}</span>
                </div>
                <div className="flex items-center py-3 border-b border-gray-100 dark:border-slate-700">
                  <span className="w-28 text-base font-black text-gray-900 dark:text-slate-100 flex-shrink-0">状态</span>
                  <span className={getStatusBadge(logItem.status)}>
                    {logItem.status === 'success' ? '成功' : '失败'}
                  </span>
                </div>
              </div>

              {/* 用户和请求信息 */}
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center py-3 border-b border-gray-100 dark:border-slate-700">
                  <span className="w-28 text-base font-black text-gray-900 dark:text-slate-100 flex-shrink-0">操作用户</span>
                  <span className="text-sm text-gray-700 dark:text-slate-200">{logItem.userName} <span className="text-xs text-gray-500 dark:text-slate-400">({logItem.userId})</span></span>
                </div>
                <div className="flex items-center py-3 border-b border-gray-100 dark:border-slate-700">
                  <span className="w-28 text-base font-black text-gray-900 dark:text-slate-100 flex-shrink-0">来源 IP</span>
                  <span className="text-sm text-green-700 dark:text-green-400 font-mono bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">{logItem.sourceIp}</span>
                </div>
                <div className="flex items-center py-3 border-b border-gray-100 dark:border-slate-700">
                  <span className="w-28 text-base font-black text-gray-900 dark:text-slate-100 flex-shrink-0">请求方法</span>
                  <span className="text-sm text-purple-700 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded">{logItem.requestMethod}</span>
                </div>
                <div className="flex items-center py-3 border-b border-gray-100 dark:border-slate-700">
                  <span className="w-28 text-base font-black text-gray-900 dark:text-slate-100 flex-shrink-0">操作时间</span>
                  <span className="text-sm text-gray-700 dark:text-slate-200">
                    {new Date(logItem.time * 1000).toLocaleString('zh-CN')}
                  </span>
                </div>
              </div>

              {/* 请求 URL */}
              <div className="py-3 border-b border-gray-100 dark:border-slate-700">
                <div className="flex items-start">
                  <span className="w-28 text-base font-black text-gray-900 dark:text-slate-100 flex-shrink-0 mt-0.5">请求 URL</span>
                  <span className="text-sm text-orange-700 dark:text-orange-400 font-mono bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded break-all">{logItem.requestUrl}</span>
                </div>
              </div>

              {/* 操作信息 */}
              <div className="py-3 border-b border-gray-100 dark:border-slate-700">
                <div className="flex items-start">
                  <span className="w-28 text-base font-black text-gray-900 dark:text-slate-100 flex-shrink-0 mt-0.5">操作信息</span>
                  <span className="text-sm text-gray-700 dark:text-slate-200">{logItem.message}</span>
                </div>
              </div>

              {/* 用户代理 */}
              <div className="py-3 border-b border-gray-100 dark:border-slate-700">
                <div className="flex items-start">
                  <span className="w-28 text-base font-black text-gray-900 dark:text-slate-100 flex-shrink-0 mt-0.5">用户代理</span>
                  <span className="text-xs text-gray-600 dark:text-slate-300 font-mono bg-gray-50 dark:bg-slate-700 px-2 py-1 rounded break-all">{logItem.userAgent}</span>
                </div>
              </div>

              {/* 错误信息 */}
              {logItem.errorMessage && (
                <div className="py-3">
                  <div className="flex items-start">
                    <span className="w-28 text-base font-black text-gray-900 dark:text-slate-100 flex-shrink-0 mt-0.5">错误信息</span>
                    <span className="text-sm text-red-700 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">{logItem.errorMessage}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DrawerContent>
    </DrawerProvider>
  );
}
