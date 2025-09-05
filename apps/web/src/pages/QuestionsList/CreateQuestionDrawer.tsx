import { Button, Input, Select } from 'antd';
import React, { useState } from 'react';
import { createInterviewQuestion } from '../../api/questions';
import DrawerProvider, { DrawerContent, DrawerFooter, DrawerHeader } from '../../components/DrawerProvider';
import { message as globalMessage } from '../../components/Message';

interface CreateQuestionDrawerProps {
  open: boolean;
  onClose: () => void;
  jobId: string | undefined;
  tags: Array<{ id: string; name: string }>;
  adaptiveTextareaRows: number;
  onRefresh: () => Promise<void>;
  onRefreshJobs: () => Promise<any>;
}

const CreateQuestionDrawer: React.FC<CreateQuestionDrawerProps> = ({
  open,
  onClose,
  jobId,
  tags,
  adaptiveTextareaRows,
  onRefresh,
  onRefreshJobs,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTagId, setNewTagId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  // 下拉搜索：按 label 文本模糊匹配（忽略大小写）
  const selectFilterOption = (input: string, option?: any) => {
    const label: string = (option?.label ?? option?.children ?? '').toString();
    return label.toLowerCase().includes(input.toLowerCase());
  };

  const handleSave = async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      await createInterviewQuestion({
        jobId,
        title: newTitle.trim(),
        description: newDesc,
        tagId: newTagId ?? null,
      });
      globalMessage.success('已成功创建押题内容！');
      onClose();
      await onRefresh();
      await onRefreshJobs();
    } catch (e: any) {
      globalMessage.error(e?.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNewTitle('');
    setNewDesc('');
    setNewTagId(undefined);
    onClose();
  };

  return (
    <DrawerProvider
      open={open}
      onClose={handleClose}
      width="60%"
    >
      <DrawerHeader>新建押题</DrawerHeader>
      <DrawerContent>
        <div className="space-y-4 h-[70vh] flex flex-col">
          <div>
            <div className="text-sm mb-1">标签<span className="text-red-500"> *</span></div>
            <Select
              allowClear
              placeholder="选择标签"
              value={newTagId}
              onChange={(v) => setNewTagId(v)}
              options={tags.map((t) => ({ value: t.id, label: t.name }))}
              className="w-full"
              style={{ height: 40 }}
              showSearch
              filterOption={selectFilterOption}
            />
          </div>
          
          <div>
            <div className="text-sm mb-1">问题<span className="text-red-500"> *</span></div>
            <Input 
              value={newTitle} 
              onChange={(e) => setNewTitle(e.target.value)} 
              maxLength={200} 
            />
          </div>
          
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="text-sm mb-1">问题描述<span className="text-red-500"> *</span></div>
            <Input.TextArea
              rows={adaptiveTextareaRows}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              maxLength={1000}
              className="flex-1 min-h-0"
              style={{ 
                height: '100%',
                resize: 'none'
              }}
            />
            <div className="text-right text-xs text-slate-500 mt-1">
              {newDesc.length} / 1000
            </div>
          </div>
        </div>
      </DrawerContent>
      <DrawerFooter>
        <div className="flex justify-end gap-2">
          <Button onClick={handleClose}>取消</Button>
          <Button
            type="primary"
            disabled={!jobId || !newTitle.trim()}
            loading={loading}
            onClick={handleSave}
          >
            保存
          </Button>
        </div>
      </DrawerFooter>
    </DrawerProvider>
  );
};

export default CreateQuestionDrawer;
