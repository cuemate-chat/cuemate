import { Button, Select } from 'antd';
import { useState } from 'react';
import { batchSyncToInterviewQuestions } from '../../api/preset-questions';
import DrawerProvider, { DrawerContent, DrawerFooter, DrawerHeader } from '../../components/DrawerProvider';
import { message as globalMessage } from '../../components/Message';

interface BatchSyncDrawerProps {
  open: boolean;
  onClose: () => void;
  selectedIds: string[];
  jobs: Array<{ id: string; title: string }>;
  onSuccess: () => void;
}

export default function BatchSyncDrawer({
  open,
  onClose,
  selectedIds,
  jobs,
  onSuccess
}: BatchSyncDrawerProps) {
  const [syncJobId, setSyncJobId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  // 下拉搜索：按 label 文本模糊匹配（忽略大小写）
  const selectFilterOption = (input: string, option?: any) => {
    const label: string = (option?.label ?? option?.children ?? '').toString();
    return label.toLowerCase().includes(input.toLowerCase());
  };

  const onBatchSync = async () => {
    if (selectedIds.length === 0) {
      globalMessage.warning('请先选择要同步的题目');
      return;
    }
    if (!syncJobId) {
      globalMessage.warning('请选择目标岗位');
      return;
    }

    setLoading(true);
    try {
      const result = await batchSyncToInterviewQuestions({
        presetQuestionIds: selectedIds,
        jobId: syncJobId,
      });
      globalMessage.success(`同步成功：新增 ${result.syncedCount} 个，跳过 ${result.skippedCount} 个重复项`);
      setSyncJobId(undefined);
      onSuccess();
    } catch (e: any) {
      globalMessage.error(e?.message || '同步失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DrawerProvider
      open={open}
      onClose={onClose}
      width="50%"
    >
      <DrawerHeader>
        批量同步选中题目到面试题库
      </DrawerHeader>

      <DrawerContent>
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="text-blue-800 dark:text-blue-300 font-medium mb-2">同步信息</div>
            <div className="text-blue-700 dark:text-blue-400 text-sm">
              已选择 <span className="font-semibold">{selectedIds.length}</span> 个题目进行同步
            </div>
          </div>

          <div>
            <div className="text-sm mb-2 font-medium text-slate-700 dark:text-slate-200">选择目标岗位<span className="text-red-500 dark:text-red-400"> *</span></div>
            <Select
              placeholder="请选择要同步到的岗位"
              value={syncJobId}
              onChange={setSyncJobId}
              options={jobs.map((j) => ({ value: j.id, label: j.title }))}
              style={{ width: '100%' }}
              showSearch
              filterOption={selectFilterOption}
            />
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="text-yellow-800 dark:text-yellow-300 text-sm">
              <div className="font-medium mb-1">注意事项：</div>
              <ul className="list-disc list-inside space-y-1">
                <li>重复的题目将被自动跳过，不会重复添加</li>
                <li>同步后的题目可以在对应岗位的面试押题中查看和使用</li>
                <li>此操作不可撤销，请确认无误后再进行同步</li>
              </ul>
            </div>
          </div>

        </div>
      </DrawerContent>

      <DrawerFooter>
        <div className="flex justify-end gap-3">
          <Button onClick={onClose} size="large">
            取消
          </Button>
          <Button 
            type="primary" 
            onClick={onBatchSync}
            disabled={selectedIds.length === 0 || !syncJobId}
            loading={loading}
            size="large"
          >
            开始同步
          </Button>
        </div>
      </DrawerFooter>
    </DrawerProvider>
  );
}
