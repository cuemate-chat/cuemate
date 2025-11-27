import { Button, Select } from 'antd';
import { useEffect, useState } from 'react';
import { batchSyncByTags, countQuestionsByTags } from '../../api/preset-questions';
import DrawerProvider, { DrawerContent, DrawerFooter, DrawerHeader } from '../../components/DrawerProvider';
import { message as globalMessage } from '../../components/Message';

interface TagBatchSyncDrawerProps {
  open: boolean;
  onClose: () => void;
  tags: Array<{ id: string; name: string }>;
  jobs: Array<{ id: string; title: string }>;
  onSuccess: () => void;
}

export default function TagBatchSyncDrawer({
  open,
  onClose,
  tags,
  jobs,
  onSuccess
}: TagBatchSyncDrawerProps) {
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [matchedCount, setMatchedCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);

  // 下拉搜索：按 label 文本模糊匹配（忽略大小写）
  const selectFilterOption = (input: string, option?: any) => {
    const label: string = (option?.label ?? option?.children ?? '').toString();
    return label.toLowerCase().includes(input.toLowerCase());
  };

  // 当选择标签变化时，查询匹配的题目数量
  useEffect(() => {
    if (selectedTagIds.length === 0) {
      setMatchedCount(null);
      return;
    }

    const fetchCount = async () => {
      setCountLoading(true);
      try {
        const result = await countQuestionsByTags(selectedTagIds);
        setMatchedCount(result.count);
      } catch {
        setMatchedCount(null);
      } finally {
        setCountLoading(false);
      }
    };

    fetchCount();
  }, [selectedTagIds]);

  // 重置状态
  const resetState = () => {
    setSelectedTagIds([]);
    setSelectedJobIds([]);
    setMatchedCount(null);
  };

  // 关闭时重置
  const handleClose = () => {
    resetState();
    onClose();
  };

  // 执行同步
  const handleSync = async () => {
    if (selectedTagIds.length === 0) {
      globalMessage.warning('请选择至少一个标签');
      return;
    }
    if (selectedJobIds.length === 0) {
      globalMessage.warning('请选择至少一个目标岗位');
      return;
    }

    setLoading(true);
    try {
      const result = await batchSyncByTags({
        tagIds: selectedTagIds,
        jobIds: selectedJobIds,
      });
      globalMessage.success(
        `同步成功：共 ${result.totalQuestions} 道题目同步到 ${result.totalJobs} 个岗位，新增 ${result.syncedCount} 条，跳过 ${result.skippedCount} 条重复项`
      );
      resetState();
      onSuccess();
    } catch (e: any) {
      globalMessage.error(e?.message || '同步失败');
    } finally {
      setLoading(false);
    }
  };

  // 计算预估同步数量
  const estimatedSyncCount = matchedCount !== null && selectedJobIds.length > 0
    ? matchedCount * selectedJobIds.length
    : null;

  return (
    <DrawerProvider
      open={open}
      onClose={handleClose}
      width="50%"
    >
      <DrawerHeader>
        按标签批量同步到面试题库
      </DrawerHeader>

      <DrawerContent>
        <div className="space-y-6">
          {/* 标签选择 */}
          <div>
            <div className="text-sm mb-2 font-medium text-slate-700 dark:text-slate-200">
              选择标签<span className="text-red-500 dark:text-red-400"> *</span>
            </div>
            <Select
              mode="multiple"
              placeholder="请选择要同步的标签（可多选）"
              value={selectedTagIds}
              onChange={setSelectedTagIds}
              options={tags.map((t) => ({ value: t.id, label: t.name }))}
              style={{ width: '100%' }}
              showSearch
              filterOption={selectFilterOption}
              maxTagCount="responsive"
            />
            {selectedTagIds.length > 0 && (
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                已选择 {selectedTagIds.length} 个标签
                {countLoading ? (
                  <span className="ml-2 text-blue-600">，正在查询匹配题目数量...</span>
                ) : matchedCount !== null ? (
                  <span className="ml-1">，共匹配 <span className="font-semibold text-blue-600">{matchedCount}</span> 道题目</span>
                ) : null}
              </div>
            )}
          </div>

          {/* 岗位选择 */}
          <div>
            <div className="text-sm mb-2 font-medium text-slate-700 dark:text-slate-200">
              选择目标岗位<span className="text-red-500 dark:text-red-400"> *</span>
            </div>
            <Select
              mode="multiple"
              placeholder="请选择要同步到的岗位（可多选）"
              value={selectedJobIds}
              onChange={setSelectedJobIds}
              options={jobs.map((j) => ({ value: j.id, label: j.title }))}
              style={{ width: '100%' }}
              showSearch
              filterOption={selectFilterOption}
              maxTagCount="responsive"
            />
            {selectedJobIds.length > 0 && (
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                已选择 {selectedJobIds.length} 个岗位
              </div>
            )}
          </div>

          {/* 同步预览 */}
          {estimatedSyncCount !== null && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="text-blue-800 dark:text-blue-300 font-medium mb-2">同步预览</div>
              <div className="text-blue-700 dark:text-blue-400 text-sm space-y-1">
                <div>• <span className="font-semibold">{matchedCount}</span> 道题目 → <span className="font-semibold">{selectedJobIds.length}</span> 个岗位</div>
                <div>• 预计新增：<span className="font-semibold">{estimatedSyncCount}</span> 条押题记录</div>
                <div>• 跳过重复：已存在的题目将被跳过</div>
              </div>
            </div>
          )}

          {/* 注意事项 */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="text-yellow-800 dark:text-yellow-300 text-sm">
              <div className="font-medium mb-1">注意事项：</div>
              <ul className="list-disc list-inside space-y-1">
                <li>将选中标签下的所有题目同步到选中的所有岗位</li>
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
          <Button onClick={handleClose} size="large">
            取消
          </Button>
          <Button
            type="primary"
            onClick={handleSync}
            disabled={selectedTagIds.length === 0 || selectedJobIds.length === 0 || matchedCount === 0}
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
