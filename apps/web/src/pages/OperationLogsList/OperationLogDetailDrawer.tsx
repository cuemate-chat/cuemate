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
        return `${baseClass} bg-green-100 text-green-800`;
      case 'failed':
        return `${baseClass} bg-red-100 text-red-800`;
      default:
        return `${baseClass} bg-gray-100 text-gray-800`;
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
          <div className="bg-white rounded-lg border p-6">
            <div className="space-y-6">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center py-3 border-b border-gray-100">
                  <span className="w-28 text-base font-black text-gray-900 flex-shrink-0">操作菜单</span>
                  <span className="text-sm text-gray-700">{logItem.menu}</span>
                </div>
                <div className="flex items-center py-3 border-b border-gray-100">
                  <span className="w-28 text-base font-black text-gray-900 flex-shrink-0">资源类型</span>
                  <span className="text-sm text-gray-700">{logItem.type}</span>
                </div>
                <div className="flex items-start py-3 border-b border-gray-100">
                  <span className="w-28 text-base font-black text-gray-900 flex-shrink-0 mt-0.5">资源 ID</span>
                  <span className="text-sm text-blue-700 font-mono bg-blue-50 px-2 py-1 rounded break-all">{logItem.resource_id}</span>
                </div>
                <div className="flex items-center py-3 border-b border-gray-100">
                  <span className="w-28 text-base font-black text-gray-900 flex-shrink-0">资源名称</span>
                  <span className="text-sm text-gray-700">{logItem.resource_name}</span>
                </div>
                <div className="flex items-center py-3 border-b border-gray-100">
                  <span className="w-28 text-base font-black text-gray-900 flex-shrink-0">操作类型</span>
                  <span className="text-sm text-gray-700">{logItem.operation}</span>
                </div>
                <div className="flex items-center py-3 border-b border-gray-100">
                  <span className="w-28 text-base font-black text-gray-900 flex-shrink-0">状态</span>
                  <span className={getStatusBadge(logItem.status)}>
                    {logItem.status === 'success' ? '成功' : '失败'}
                  </span>
                </div>
              </div>

              {/* 用户和请求信息 */}
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center py-3 border-b border-gray-100">
                  <span className="w-28 text-base font-black text-gray-900 flex-shrink-0">操作用户</span>
                  <span className="text-sm text-gray-700">{logItem.user_name} <span className="text-xs text-gray-500">({logItem.user_id})</span></span>
                </div>
                <div className="flex items-center py-3 border-b border-gray-100">
                  <span className="w-28 text-base font-black text-gray-900 flex-shrink-0">来源 IP</span>
                  <span className="text-sm text-green-700 font-mono bg-green-50 px-2 py-1 rounded">{logItem.source_ip}</span>
                </div>
                <div className="flex items-center py-3 border-b border-gray-100">
                  <span className="w-28 text-base font-black text-gray-900 flex-shrink-0">请求方法</span>
                  <span className="text-sm text-purple-700 font-bold bg-purple-50 px-2 py-1 rounded">{logItem.request_method}</span>
                </div>
                <div className="flex items-center py-3 border-b border-gray-100">
                  <span className="w-28 text-base font-black text-gray-900 flex-shrink-0">操作时间</span>
                  <span className="text-sm text-gray-700">
                    {new Date(logItem.time * 1000).toLocaleString('zh-CN')}
                  </span>
                </div>
              </div>

              {/* 请求 URL */}
              <div className="py-3 border-b border-gray-100">
                <div className="flex items-start">
                  <span className="w-28 text-base font-black text-gray-900 flex-shrink-0 mt-0.5">请求 URL</span>
                  <span className="text-sm text-orange-700 font-mono bg-orange-50 px-2 py-1 rounded break-all">{logItem.request_url}</span>
                </div>
              </div>

              {/* 操作信息 */}
              <div className="py-3 border-b border-gray-100">
                <div className="flex items-start">
                  <span className="w-28 text-base font-black text-gray-900 flex-shrink-0 mt-0.5">操作信息</span>
                  <span className="text-sm text-gray-700">{logItem.message}</span>
                </div>
              </div>

              {/* 用户代理 */}
              <div className="py-3 border-b border-gray-100">
                <div className="flex items-start">
                  <span className="w-28 text-base font-black text-gray-900 flex-shrink-0 mt-0.5">用户代理</span>
                  <span className="text-xs text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded break-all">{logItem.user_agent}</span>
                </div>
              </div>

              {/* 错误信息 */}
              {logItem.error_message && (
                <div className="py-3">
                  <div className="flex items-start">
                    <span className="w-28 text-base font-black text-gray-900 flex-shrink-0 mt-0.5">错误信息</span>
                    <span className="text-sm text-red-700 font-medium bg-red-50 px-2 py-1 rounded">{logItem.error_message}</span>
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
