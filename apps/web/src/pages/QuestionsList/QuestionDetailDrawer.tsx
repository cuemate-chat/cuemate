import { Button, Input, Select } from 'antd';
import dayjs from 'dayjs';
import React, { useState } from 'react';
import { deleteInterviewQuestion, updateInterviewQuestion } from '../../api/questions';
import DrawerProvider, { DrawerContent, DrawerFooter, DrawerHeader } from '../../components/DrawerProvider';
import { message as globalMessage } from '../../components/Message';

interface QuestionDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  current: any | null;
  tags: Array<{ id: string; name: string }>;
  adaptiveTextareaRows: number;
  onRefresh: () => Promise<void>;
  onRefreshJobs: () => Promise<any>;
}

const QuestionDetailDrawer: React.FC<QuestionDetailDrawerProps> = ({
  open,
  onClose,
  current,
  tags,
  adaptiveTextareaRows,
  onRefresh,
  onRefreshJobs,
}) => {
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTagId, setEditTagId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  // 当下拉搜索：按 label 文本模糊匹配（忽略大小写）
  const selectFilterOption = (input: string, option?: any) => {
    const label: string = (option?.label ?? option?.children ?? '').toString();
    return label.toLowerCase().includes(input.toLowerCase());
  };

  // 当 current 变化时，更新编辑状态
  React.useEffect(() => {
    if (current) {
      setEditTitle(current.title || '');
      setEditDesc(current.description || '');
      setEditTagId(current.tag_id || undefined);
    }
  }, [current]);

  const onSave = async () => {
    if (!current) return;
    setLoading(true);
    try {
      await updateInterviewQuestion(current.id, {
        title: editTitle,
        description: editDesc,
        tagId: editTagId ?? null,
      });
      globalMessage.success('已保存修改');
      onClose();
      await onRefresh();
      await onRefreshJobs();
    } catch (e: any) {
      globalMessage.error(e?.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    if (!current) return;
    setLoading(true);
    try {
      await deleteInterviewQuestion(current.id);
      globalMessage.success('已删除');
      onClose();
      await onRefresh();
      await onRefreshJobs();
    } catch (e: any) {
      globalMessage.error(e?.message || '删除失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DrawerProvider
      open={open}
      onClose={onClose}
      width="60%"
    >
      <DrawerHeader>押题详情</DrawerHeader>
      <DrawerContent>
        {current && (
          <div className="space-y-4 h-[70vh] flex flex-col">
            <div className="text-xs text-slate-500">
              创建时间：{dayjs(current.created_at).format('YYYY-MM-DD HH:mm')}{' '}
              <span className="ml-3 text-red-500">
                {current.vector_status ? '已同步到向量库' : '未同步到向量库，保存后自动同步'}
              </span>
            </div>
            
            <div>
              <div className="text-sm mb-1">标签<span className="text-red-500"> *</span></div>
              <Select
                allowClear
                placeholder="选择标签"
                value={editTagId}
                onChange={(v) => setEditTagId(v)}
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
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={200}
              />
            </div>
            
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="text-sm mb-1">问题描述<span className="text-red-500"> *</span></div>
              <Input.TextArea
                rows={adaptiveTextareaRows}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                maxLength={5000}
                className="flex-1 min-h-0"
                style={{ 
                  height: '100%',
                  resize: 'none'
                }}
              />
            </div>
          </div>
        )}
      </DrawerContent>
      <DrawerFooter>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>取消</Button>
          <Button 
            danger 
            onClick={onDelete}
            loading={loading}
          >
            删除
          </Button>
          <Button 
            type="primary" 
            onClick={onSave}
            loading={loading}
          >
            编辑保存
          </Button>
        </div>
      </DrawerFooter>
    </DrawerProvider>
  );
};

export default QuestionDetailDrawer;
