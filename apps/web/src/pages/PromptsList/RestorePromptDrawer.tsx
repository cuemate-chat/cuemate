import { Button } from 'antd';
import { useState } from 'react';
import { Prompt, updatePrompt } from '../../api/prompts';
import DrawerProvider, { DrawerContent, DrawerFooter, DrawerHeader } from '../../components/DrawerProvider';
import { message } from '../../components/Message';

interface RestorePromptDrawerProps {
  open: boolean;
  prompt: Prompt | null;
  onClose: () => void;
  onRestore: () => void;
}

export default function RestorePromptDrawer({
  open,
  prompt,
  onClose,
  onRestore,
}: RestorePromptDrawerProps) {
  const [restoring, setRestoring] = useState(false);

  const handleRestoreToHistory = async () => {
    if (!prompt || !prompt.historyPre) return;

    setRestoring(true);
    try {
      await updatePrompt(prompt.id, { content: prompt.historyPre });
      message.success('已恢复到上一版本');
      onRestore();
    } catch (err: any) {
      message.error(err?.message || '恢复失败');
    } finally {
      setRestoring(false);
    }
  };

  const handleRestoreToDefault = async () => {
    if (!prompt) return;

    setRestoring(true);
    try {
      await updatePrompt(prompt.id, { content: prompt.defaultContent });
      message.success('已恢复到默认值');
      onRestore();
    } catch (err: any) {
      message.error(err?.message || '恢复失败');
    } finally {
      setRestoring(false);
    }
  };

  if (!prompt) return null;

  return (
    <DrawerProvider open={open} onClose={onClose} width="70%">
      <DrawerHeader>恢复 Prompt: {prompt.id}</DrawerHeader>

      <DrawerContent>
        <div className="space-y-6">
          {/* 当前版本 */}
          <div>
            <div className="text-sm font-medium text-slate-700 dark:text-white mb-2">
              当前版本
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
              <pre className="text-xs text-slate-600 dark:text-white whitespace-pre-wrap font-mono max-h-60 overflow-y-auto">
                {prompt.content}
              </pre>
            </div>
          </div>

          {/* 上一版本 */}
          <div>
            <div className="text-sm font-medium text-slate-700 dark:text-white mb-2">
              上一版本内容
            </div>
            {prompt.historyPre ? (
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                <pre className="text-xs text-amber-900 dark:text-white whitespace-pre-wrap font-mono max-h-60 overflow-y-auto">
                  {prompt.historyPre}
                </pre>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-sm text-slate-400">暂无历史版本</span>
              </div>
            )}
          </div>

          {/* 默认值 */}
          <div>
            <div className="text-sm font-medium text-slate-700 dark:text-white mb-2">
              默认值内容
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <pre className="text-xs text-blue-900 dark:text-white whitespace-pre-wrap font-mono max-h-60 overflow-y-auto">
                {prompt.defaultContent}
              </pre>
            </div>
          </div>

          {/* 提示信息 */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200">
            <div className="text-sm font-medium text-yellow-800 mb-2">
              注意事项
            </div>
            <div className="text-xs text-yellow-700 space-y-1">
              <div>• 恢复操作会将当前内容保存到历史记录中</div>
              <div>• 上一版本：上次修改前的内容</div>
              <div>• 默认值：系统初始化时的原始内容</div>
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
            onClick={handleRestoreToHistory}
            disabled={!prompt.historyPre}
            loading={restoring}
            size="large"
            className="bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300"
          >
            恢复到上一版本
          </Button>
          <Button
            type="primary"
            onClick={handleRestoreToDefault}
            loading={restoring}
            size="large"
          >
            恢复到默认值
          </Button>
        </div>
      </DrawerFooter>
    </DrawerProvider>
  );
}
