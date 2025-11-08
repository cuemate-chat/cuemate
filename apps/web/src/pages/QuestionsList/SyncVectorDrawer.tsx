import { ArrowPathIcon, ChartBarIcon, CheckCircleIcon, CircleStackIcon, CloudArrowUpIcon, InformationCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Button } from 'antd';
import React, { useEffect, useState } from 'react';
import { getIQSyncStats, syncIQBatch } from '../../api/questions';
import DrawerProvider, { DrawerContent, DrawerFooter, DrawerHeader } from '../../components/DrawerProvider';
import { message as globalMessage } from '../../components/Message';

interface SyncVectorDrawerProps {
  open: boolean;
  onClose: () => void;
  jobId: string | undefined;
  syncStats: {
    total: number;
    synced: number;
    unsynced: number;
  } | null;
  onRefresh: () => Promise<void>;
}

const SyncVectorDrawer: React.FC<SyncVectorDrawerProps> = ({
  open,
  onClose,
  jobId,
  syncStats,
  onRefresh,
}) => {
  const [syncing, setSyncing] = useState(false);
  const [localSyncStats, setLocalSyncStats] = useState(syncStats);

  // 当传入的 syncStats 变化时，更新本地状态
  useEffect(() => {
    setLocalSyncStats(syncStats);
  }, [syncStats]);

  const handleBatchSync = async () => {
    if (!jobId) return;
    setSyncing(true);
    try {
      const res = await syncIQBatch(jobId);
      globalMessage.success(`批量同步完成：成功 ${res.success} 条，失败 ${res.failed} 条，清理 ${res.deletedExtras || 0} 条残留`);
      await onRefresh();
      // 重新获取统计数据并更新本地状态
      const newStats = await getIQSyncStats(jobId);
      setLocalSyncStats(newStats);
    } catch (e: any) {
      globalMessage.error(e?.message || '同步失败');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <DrawerProvider
      open={open}
      onClose={onClose}
      width="50%"
    >
      <DrawerHeader>
        <div className="flex items-center gap-2">
          <CircleStackIcon className="w-5 h-5 text-blue-600" />
          <span>同步向量库</span>
        </div>
      </DrawerHeader>
      <DrawerContent>
        <div className="space-y-6">
          {/* 功能介绍 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CloudArrowUpIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
              <div>
                <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">向量库同步</div>
                <div className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                  <div>• 将岗位押题同步到向量知识库，便于智能检索和相似度匹配</div>
                  <div>• 支持批量同步操作，自动处理重复和无效数据</div>
                  <div>• 同步后可在面试复盘中快速找到相关问题和答案</div>
                </div>
              </div>
            </div>
          </div>

          {/* 同步状态统计 */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ChartBarIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">同步状态统计</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border border-slate-200 p-4 bg-gradient-to-br from-slate-50 to-slate-100 relative overflow-hidden">
                <div className="absolute top-2 right-2">
                  <ChartBarIcon className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-xs text-slate-500 mb-1">总押题数</div>
                <div className="text-2xl font-bold text-slate-700">{localSyncStats?.total ?? '-'}</div>
                <div className="text-xs text-slate-500 mt-1">当前岗位下的全部押题</div>
              </div>
              <div className="rounded-lg border border-emerald-200 p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 relative overflow-hidden">
                <div className="absolute top-2 right-2">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-xs text-emerald-700 mb-1">已同步</div>
                <div className="text-2xl font-bold text-emerald-700">{localSyncStats?.synced ?? '-'}</div>
                <div className="text-xs text-emerald-600 mt-1">已加入向量库</div>
              </div>
              <div className="rounded-lg border border-rose-200 p-4 bg-gradient-to-br from-rose-50 to-rose-100 relative overflow-hidden">
                <div className="absolute top-2 right-2">
                  <XCircleIcon className="w-4 h-4 text-rose-500" />
                </div>
                <div className="text-xs text-rose-700 mb-1">未同步</div>
                <div className="text-2xl font-bold text-rose-700">{localSyncStats?.unsynced ?? '-'}</div>
                <div className="text-xs text-rose-600 mt-1">待处理的押题</div>
              </div>
            </div>
          </div>

          {/* 同步进度可视化 */}
          {localSyncStats && localSyncStats.total > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ArrowPathIcon className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">同步进度</span>
              </div>
              <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-full transition-all duration-300"
                  style={{ width: `${(localSyncStats.synced / localSyncStats.total * 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>同步率: {((localSyncStats.synced / localSyncStats.total) * 100).toFixed(1)}%</span>
                <span>{localSyncStats.synced}/{localSyncStats.total}</span>
              </div>
            </div>
          )}

          {/* 操作说明 */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <InformationCircleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-2">同步说明</div>
                <div className="text-sm text-yellow-600 dark:text-yellow-400 space-y-1">
                  <div>• 批量同步会处理当前岗位下的所有押题数据</div>
                  <div>• 系统会自动跳过已同步的内容，只处理新增或变更的数据</div>
                  <div>• 同步过程中会清理无效的向量库残留数据</div>
                  <div>• 建议在添加新押题后及时进行同步操作</div>
                </div>
              </div>
            </div>
          </div>

          {/* 当前状态提示 */}
          {!jobId && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <XCircleIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <div className="text-sm text-gray-500">请先选择要同步的岗位</div>
            </div>
          )}

          {syncing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <div className="text-sm text-blue-700">
                  正在批量同步押题到向量库，请稍候...
                </div>
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
      <DrawerFooter>
        <div className="flex items-center justify-end gap-3">
          <Button onClick={onClose}>关闭</Button>
          <Button
            type="primary"
            disabled={!jobId}
            loading={syncing}
            onClick={handleBatchSync}
          >
            {syncing ? '同步中...' : '批量同步当前岗位的押题到向量库'}
          </Button>
        </div>
      </DrawerFooter>
    </DrawerProvider>
  );
};

export default SyncVectorDrawer;
