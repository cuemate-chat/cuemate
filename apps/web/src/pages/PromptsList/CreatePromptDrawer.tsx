import { Button, Input, Select } from 'antd';
import { useState } from 'react';
import DrawerProvider, { DrawerContent, DrawerFooter, DrawerHeader } from '../../components/DrawerProvider';

const { TextArea } = Input;

interface CreatePromptDrawerProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: {
    id: string;
    content: string;
    description: string;
    source: 'desktop' | 'web';
  }) => void;
}

export default function CreatePromptDrawer({
  open,
  onClose,
  onCreate,
}: CreatePromptDrawerProps) {
  const [id, setId] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [source, setSource] = useState<'desktop' | 'web'>('desktop');
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    if (!id.trim()) {
      return;
    }
    if (!content.trim()) {
      return;
    }

    setSaving(true);
    onCreate({
      id: id.trim(),
      content: content.trim(),
      description: description.trim(),
      source,
    });
    setSaving(false);

    // 重置表单
    setId('');
    setDescription('');
    setContent('');
    setSource('desktop');
  };

  const handleClose = () => {
    setId('');
    setDescription('');
    setContent('');
    setSource('desktop');
    onClose();
  };

  return (
    <DrawerProvider open={open} onClose={handleClose} width="60%">
      <DrawerHeader>新增 Prompt</DrawerHeader>

      <DrawerContent>
        <div className="space-y-6">
          {/* ID 输入 */}
          <div>
            <div className="text-sm mb-2 font-medium text-slate-700">
              Prompt ID <span className="text-red-500">*</span>
            </div>
            <Input
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="例如: InitPrompt, AnswerPrompt"
              className="font-mono"
              style={{ height: 40 }}
            />
            <div className="mt-1 text-xs text-slate-500">
              ID 必须唯一，建议使用驼峰命名
            </div>
          </div>

          {/* 描述输入 */}
          <div>
            <div className="text-sm mb-2 font-medium text-slate-700">描述</div>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简要描述这个 Prompt 的用途"
              style={{ height: 40 }}
            />
          </div>

          {/* 来源选择 */}
          <div>
            <div className="text-sm mb-2 font-medium text-slate-700">
              来源 <span className="text-red-500">*</span>
            </div>
            <Select
              value={source}
              onChange={(v) => setSource(v)}
              style={{ width: '100%', height: 40 }}
              options={[
                { label: 'Desktop', value: 'desktop' },
                { label: 'Web', value: 'web' },
              ]}
            />
          </div>

          {/* 内容输入 */}
          <div>
            <div className="text-sm mb-2 font-medium text-slate-700">
              Prompt 内容 <span className="text-red-500">*</span>
            </div>
            <TextArea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={20}
              placeholder="输入 Prompt 内容，支持模板变量，例如 ${jobPosition.title}"
              className="font-mono"
              maxLength={10000}
              showCount
            />
          </div>

          {/* 提示信息 */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-sm font-medium text-blue-800 mb-2">
              模板变量使用说明
            </div>
            <div className="text-xs text-blue-700 space-y-1">
              <div>• 使用 ${'{'}variableName{'}'} 格式定义变量</div>
              <div>• 例如: ${'{'}jobPosition.title{'}'}, ${'{'}resume.content{'}'}</div>
              <div>• 保存后变量会自动被识别和保护</div>
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
            onClick={handleSave}
            disabled={!id.trim() || !content.trim()}
            loading={saving}
            size="large"
          >
            保存
          </Button>
        </div>
      </DrawerFooter>
    </DrawerProvider>
  );
}
