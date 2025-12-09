import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import { Button, Input } from 'antd';
import { useEffect, useState } from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { Prompt } from '../../api/prompts';
import DrawerProvider, { DrawerContent, DrawerFooter, DrawerHeader } from '../../components/DrawerProvider';
import { message } from '../../components/Message';

const { TextArea } = Input;

interface EditPromptDrawerProps {
  open: boolean;
  prompt: Prompt | null;
  onClose: () => void;
  onSave: (id: string, content: string, extra?: string) => void;
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
  const [extra, setExtra] = useState('');
  const [saving, setSaving] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  // 使用平衡括号匹配提取模板变量，正确处理嵌套花括号
  const extractTemplateVariables = (content: string): string[] => {
    const variables: string[] = [];
    let i = 0;
    while (i < content.length) {
      if (content[i] === '$' && content[i + 1] === '{') {
        const start = i;
        let depth = 1;
        i += 2;
        while (i < content.length && depth > 0) {
          if (content[i] === '{') {
            depth++;
          } else if (content[i] === '}') {
            depth--;
          }
          i++;
        }
        if (depth === 0) {
          variables.push(content.substring(start, i));
        }
      } else {
        i++;
      }
    }
    return variables;
  };

  useEffect(() => {
    if (prompt) {
      // 使用平衡括号匹配提取变量
      const vars = extractTemplateVariables(prompt.content);
      setVariables(vars);

      // 转换为可编辑格式：将变量替换为占位符
      let display = prompt.content;
      vars.forEach((v, i) => {
        display = display.replace(v, `[变量${i + 1}:不可修改]`);
      });
      setDisplayContent(display);
      setEditedContent(display);

      // 加载 extra 字段
      setExtra(prompt.extra || '');
    }
  }, [prompt]);

  const handleSave = () => {
    if (!prompt) return;

    // 校验所有变量占位符是否都存在
    const missingVars: number[] = [];
    variables.forEach((_, i) => {
      const placeholder = `[变量${i + 1}:不可修改]`;
      if (!editedContent.includes(placeholder)) {
        missingVars.push(i + 1);
      }
    });

    if (missingVars.length > 0) {
      message.warning(`保存失败：缺少变量占位符 [变量${missingVars.join(', 变量')}:不可修改]，请勿删除变量占位符`);
      return;
    }

    // 恢复变量：将占位符替换回原始变量
    let finalContent = editedContent;
    const vars = prompt.content.match(/\$\{[^}]+\}/g) || [];
    vars.forEach((v, i) => {
      finalContent = finalContent.replace(`[变量${i + 1}:不可修改]`, v);
    });

    setSaving(true);
    onSave(prompt.id, finalContent, extra.trim() || undefined);
    setSaving(false);
  };

  const handleReset = () => {
    setEditedContent(displayContent);
    setExtra(prompt?.extra || '');
    message.success('已重置为初始内容');
  };

  // 获取预览内容（将占位符替换回原始变量）
  const getPreviewContent = () => {
    let content = editedContent;
    variables.forEach((v, i) => {
      content = content.replace(`[变量${i + 1}:不可修改]`, v);
    });
    return content;
  };

  // 切换预览/编辑模式
  const togglePreview = () => {
    setIsPreview(!isPreview);
  };

  if (!prompt) return null;

  return (
    <DrawerProvider open={open} onClose={onClose} width="60%">
      <DrawerHeader>编辑 Prompt: {prompt.id}</DrawerHeader>

      <DrawerContent>
        <div className="space-y-6">
          {/* 基本信息 */}
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">ID:</span>
              <span className="font-mono text-sm text-blue-600 dark:text-blue-400">{prompt.id}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">描述:</span>
              <span className="text-sm text-slate-900 dark:text-white">{prompt.description}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">来源:</span>
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
            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200">
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
                提示：编辑时这些变量会显示为 [变量 N:不可修改]，保存时会自动恢复为原始变量。
              </div>
            </div>
          )}

          {/* 编辑区域 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Prompt 内容 <span className="text-red-500">*</span>
              </div>
              <Button
                type={isPreview ? 'primary' : 'default'}
                size="small"
                icon={isPreview ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                onClick={togglePreview}
              >
                {isPreview ? '返回编辑' : '预览'}
              </Button>
            </div>
            {isPreview ? (
              <div className="border border-slate-300 dark:border-slate-600 rounded-lg p-4 bg-slate-50 dark:bg-slate-800 min-h-[480px] max-h-[600px] overflow-auto">
                <pre className="font-mono text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words">
                  {getPreviewContent()}
                </pre>
              </div>
            ) : (
              <TextArea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                rows={20}
                placeholder="编辑 Prompt 内容..."
                className="font-mono"
                maxLength={10000}
                showCount
              />
            )}
          </div>

          {/* Extra 配置 */}
          <div>
            <div className="text-sm mb-2 font-medium text-slate-700 dark:text-slate-200">
              Extra 配置（选填）
            </div>
            <TextArea
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              rows={3}
              placeholder='输入 JSON 格式的配置，例如: {"totalQuestions": 10}'
              className="font-mono text-xs"
              maxLength={1000}
            />
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              用于存储额外的配置参数（JSON 格式），如面试问题数量等
            </div>
          </div>

          {/* 新旧版本对比 */}
          {prompt.historyPre && (
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-slate-700 dark:text-white">
                  新旧版本对比
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded"></span>
                    <span className="text-red-600 dark:text-red-400">删除</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded"></span>
                    <span className="text-green-600 dark:text-green-400">新增</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded"></span>
                    <span className="text-yellow-600 dark:text-yellow-400">修改</span>
                  </div>
                </div>
              </div>
              <div className="border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
                <div className="flex bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                  <div className="flex-1 px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 text-center border-r border-slate-200 dark:border-slate-600">
                    上一版本 ({prompt.historyPre.length} 字)
                  </div>
                  <div className="flex-1 px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 text-center">
                    当前版本 ({(() => {
                      // 还原变量后计算字数，保持与上一版本统计口径一致
                      let content = editedContent;
                      variables.forEach((v, i) => {
                        content = content.replace(`[变量${i + 1}:不可修改]`, v);
                      });
                      return content.length;
                    })()} 字)
                  </div>
                </div>
                <div className="max-h-80 overflow-auto">
                  <ReactDiffViewer
                    oldValue={prompt.historyPre}
                    newValue={(() => {
                      // 将占位符替换回原始变量进行对比
                      let content = editedContent;
                      variables.forEach((v, i) => {
                        content = content.replace(`[变量${i + 1}:不可修改]`, v);
                      });
                      return content;
                    })()}
                    splitView={true}
                    showDiffOnly={false}
                    useDarkTheme={document.documentElement.classList.contains('dark')}
                    leftTitle=""
                    rightTitle=""
                    styles={{
                      diffContainer: {
                        fontSize: '12px',
                      },
                      diffRemoved: {
                        backgroundColor: document.documentElement.classList.contains('dark') ? '#450a0a' : '#fee2e2',
                        color: document.documentElement.classList.contains('dark') ? '#fca5a5' : '#dc2626'
                      },
                      diffAdded: {
                        backgroundColor: document.documentElement.classList.contains('dark') ? '#052e16' : '#dcfce7',
                        color: document.documentElement.classList.contains('dark') ? '#86efac' : '#16a34a'
                      },
                      wordDiff: {
                        backgroundColor: document.documentElement.classList.contains('dark') ? '#713f12' : '#fef3c7',
                        color: document.documentElement.classList.contains('dark') ? '#fcd34d' : '#d97706'
                      }
                    }}
                  />
                </div>
              </div>
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
