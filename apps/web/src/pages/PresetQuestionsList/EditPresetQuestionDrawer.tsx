import { Button, Input, Select } from 'antd';
import { useEffect, useState } from 'react';
import { PresetQuestion, updatePresetQuestion } from '../../api/preset-questions';
import DrawerProvider, { DrawerContent, DrawerFooter, DrawerHeader } from '../../components/DrawerProvider';
import { message as globalMessage } from '../../components/Message';

const { TextArea } = Input;

interface EditPresetQuestionDrawerProps {
  open: boolean;
  onClose: () => void;
  item: PresetQuestion | null;
  tags: Array<{ id: string; name: string }>;
  onSuccess: () => void;
}

export default function EditPresetQuestionDrawer({
  open,
  onClose,
  item,
  tags,
  onSuccess
}: EditPresetQuestionDrawerProps) {
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [editTagId, setEditTagId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  // 自适应文本域行数
  const [adaptiveRows, setAdaptiveRows] = useState<{ question: number; answer: number }>({ 
    question: 3, 
    answer: 6 
  });

  // 根据屏幕高度自适应计算文本域行数
  useEffect(() => {
    const calculateRows = () => {
      const viewportHeight = window.innerHeight;
      if (viewportHeight >= 1080) {
        // 大屏幕：1080p 及以上
        setAdaptiveRows({ question: 10, answer: 20 });
      } else if (viewportHeight >= 900) {
        // 中大屏幕：900-1080px
        setAdaptiveRows({ question: 8, answer: 16 });
      } else if (viewportHeight >= 768) {
        // 中屏幕：768-900px
        setAdaptiveRows({ question: 6, answer: 12 });
      } else {
        // 小屏幕：768px 以下
        setAdaptiveRows({ question: 4, answer: 8 });
      }
    };

    calculateRows();
    window.addEventListener('resize', calculateRows);
    return () => window.removeEventListener('resize', calculateRows);
  }, []);

  // 当 item 变化时更新表单数据
  useEffect(() => {
    if (item) {
      setEditQuestion(item.question);
      setEditAnswer(item.answer);
      setEditTagId(item.tag_id || undefined);
    }
  }, [item]);

  // 下拉搜索：按 label 文本模糊匹配（忽略大小写）
  const selectFilterOption = (input: string, option?: any) => {
    const label: string = (option?.label ?? option?.children ?? '').toString();
    return label.toLowerCase().includes(input.toLowerCase());
  };

  const onSaveEdit = async () => {
    if (!item) return;
    
    setLoading(true);
    try {
      await updatePresetQuestion(item.id, {
        question: editQuestion,
        answer: editAnswer,
        tag_id: editTagId || null,
      });
      globalMessage.success('保存成功');
      onSuccess();
    } catch (e: any) {
      globalMessage.error(e?.message || '保存失败');
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
      <DrawerHeader>
        编辑预置题目
      </DrawerHeader>

      <DrawerContent>
        <div className="space-y-6">
          <div>
            <div className="text-sm mb-2 font-medium text-slate-700">标签<span className="text-red-500"> *</span></div>
            <Select
              placeholder="选择标签"
              value={editTagId}
              onChange={setEditTagId}
              options={tags.map((t) => ({ value: t.id, label: t.name }))}
              className="w-full"
              style={{ height: 40 }}
              status={!editTagId ? 'error' : undefined}
              showSearch
              filterOption={selectFilterOption}
            />
          </div>

          <div>
            <div className="text-sm mb-2 font-medium text-slate-700">问题<span className="text-red-500"> *</span></div>
            <TextArea
              value={editQuestion}
              onChange={(e) => setEditQuestion(e.target.value)}
              rows={adaptiveRows.question}
              placeholder="输入面试问题..."
              maxLength={200}
              showCount
            />
          </div>

          <div>
            <div className="text-sm mb-2 font-medium text-slate-700">答案<span className="text-red-500"> *</span></div>
            <TextArea
              value={editAnswer}
              onChange={(e) => setEditAnswer(e.target.value)}
              rows={adaptiveRows.answer}
              placeholder="输入参考答案..."
              maxLength={5000}
              showCount
            />
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
            onClick={onSaveEdit}
            disabled={!editTagId || !editQuestion.trim() || !editAnswer.trim()}
            loading={loading}
            size="large"
          >
            保存
          </Button>
        </div>
      </DrawerFooter>
    </DrawerProvider>
  );
}
