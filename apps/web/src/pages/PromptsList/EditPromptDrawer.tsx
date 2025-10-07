import { Button, Input } from 'antd';
import { useEffect, useState } from 'react';
import { Prompt } from '../../api/prompts';
import DrawerProvider, { DrawerContent, DrawerFooter, DrawerHeader } from '../../components/DrawerProvider';

const { TextArea } = Input;

interface EditPromptDrawerProps {
  open: boolean;
  prompt: Prompt | null;
  onClose: () => void;
  onSave: (id: string, content: string) => void;
}

export default function EditPromptDrawer({
  open,
  prompt,
  onClose,
  onSave,
}: EditPromptDrawerProps) {
  const [editedContent, setEditedContent] = useState('');
  const [displayContent, setDisplayContent] = useState('');
  const [variables, setVariables] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (prompt) {
      // 提取变量
      const vars = prompt.content.match(/\$\{[^}]+\}/g) || [];
      setVariables(vars);

      // 转换为可编辑格式：将变量替换为占位符
      let display = prompt.content;
      vars.forEach((v, i) => {
        display = display.replace(v, `[变量${i + 1}:不可修改]`);
      });
      setDisplayContent(display);
      setEditedContent(display);
    }
  }, [prompt]);

  const handleSave = () => {
    if (!prompt) return;

    // 恢复变量：将占位符替换回原始变量
    let finalContent = editedContent;
    const vars = prompt.content.match(/\$\{[^}]+\}/g) || [];
    vars.forEach((v, i) => {
      finalContent = finalContent.replace(`[变量${i + 1}:不可修改]`, v);
    });

    setSaving(true);
    onSave(prompt.id, finalContent);
    setSaving(false);
  };

  const handleReset = () => {
    setEditedContent(displayContent);
  };

  if (!prompt) return null;

  return (
    <DrawerProvider open={open} onClose={onClose} width="60%">
      <DrawerHeader>编辑 Prompt: {prompt.id}</DrawerHeader>

      <DrawerContent>
        <div className="space-y-6">
          {/* 基本信息 */}
          <div className="bg-slate-50 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600">ID:</span>
              <span className="font-mono text-sm text-blue-600">{prompt.id}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600">描述:</span>
              <span className="text-sm">{prompt.description}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600">来源:</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  prompt.source === 'desktop'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                {prompt.source === 'desktop' ? 'Desktop' : 'Web'}
              </span>
            </div>
          </div>

          {/* 变量列表 */}
          {variables.length > 0 && (
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <div className="text-sm font-medium text-amber-800 mb-2">
                模板变量（不可修改）
              </div>
              <div className="flex flex-wrap gap-2">
                {variables.map((v, i) => (
                  <div
                    key={i}
                    className="inline-flex items-center px-3 py-1 rounded bg-amber-100 text-amber-800 text-sm font-mono border border-amber-300"
                  >
                    <span className="text-xs text-amber-600 mr-1">[变量{i + 1}]</span>
                    {v}
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs text-amber-700">
                提示：编辑时这些变量会显示为 [变量N:不可修改]，保存时会自动恢复为原始变量。
              </div>
            </div>
          )}

          {/* 编辑区域 */}
          <div>
            <div className="text-sm mb-2 font-medium text-slate-700">
              Prompt 内容
            </div>
            <TextArea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              rows={20}
              placeholder="编辑 Prompt 内容..."
              className="font-mono"
              maxLength={10000}
              showCount
            />
          </div>

          {/* 历史记录 */}
          {prompt.history_pre && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="text-sm font-medium text-slate-700 mb-2">
                上一版本内容（仅供参考）
              </div>
              <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
                {prompt.history_pre}
              </pre>
            </div>
          )}
        </div>
      </DrawerContent>

      <DrawerFooter>
        <div className="flex justify-end gap-3">
          <Button onClick={handleReset} size="large">
            重置
          </Button>
          <Button onClick={onClose} size="large">
            取消
          </Button>
          <Button type="primary" onClick={handleSave} loading={saving} size="large">
            保存
          </Button>
        </div>
      </DrawerFooter>
    </DrawerProvider>
  );
}
