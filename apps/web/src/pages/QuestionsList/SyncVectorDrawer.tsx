import { Button } from 'antd';
import React, { useState } from 'react';
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

  const handleBatchSync = async () => {
    if (!jobId) return;
    setSyncing(true);
    try {
      const { syncIQBatch } = await import('../../api/questions');
      const res = await syncIQBatch(jobId);
      globalMessage.success(`批量同步完成：成功 ${res.success} 条，失败 ${res.failed} 条，清理 ${res.deletedExtras || 0} 条残留`);
      await onRefresh();
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
      <DrawerHeader>同步向量库</DrawerHeader>
      <DrawerContent>
        <div className="space-y-5 h-[70vh] flex flex-col">
          <div className="text-[13px] text-slate-600">
            查看当前岗位押题在向量库中的同步情况
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
              <div className="text-xs text-slate-500">总数</div>
              <div className="mt-1 text-2xl font-semibold">{syncStats?.total ?? '-'}</div>
            </div>
            <div className="rounded-lg border border-emerald-200 p-4 bg-emerald-50">
              <div className="text-xs text-emerald-700">已同步</div>
              <div className="mt-1 text-2xl font-semibold text-emerald-700">{syncStats?.synced ?? '-'}</div>
            </div>
            <div className="rounded-lg border border-rose-200 p-4 bg-rose-50">
              <div className="text-xs text-rose-700">未同步</div>
              <div className="mt-1 text-2xl font-semibold text-rose-700">{syncStats?.unsynced ?? '-'}</div>
            </div>
          </div>
          
          <div className="flex-1"></div>
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
