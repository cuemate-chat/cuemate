import { CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { Button, Checkbox, Upload } from 'antd';
import { useState } from 'react';
import DrawerProvider, { DrawerContent, DrawerHeader } from '../../components/DrawerProvider';
import { useQuestionImport } from '../../hooks/useQuestionImport';

interface BatchImportDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isBuiltin?: boolean; // 是否为内置题库（从 License 页面导入为 true）
}

export default function BatchImportDrawer({
  open,
  onClose,
  onSuccess,
  isBuiltin = false
}: BatchImportDrawerProps) {
  const [importOverwrite, setImportOverwrite] = useState(false);

  // 使用导入 Hook
  const { importing, importFile } = useQuestionImport({
    overwrite: importOverwrite,
    isBuiltin: isBuiltin,
    onSuccess: () => {
      setImportOverwrite(false);
      onSuccess();
    },
  });

  // 批量导入处理
  const handleImportFile = async (file: File) => {
    await importFile(file);
    return false; // 阻止自动上传
  };

  return (
    <DrawerProvider
      open={open}
      onClose={onClose}
      width="60%"
    >
      <DrawerHeader>
        批量导入预置题目
      </DrawerHeader>

      <DrawerContent>
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="text-blue-800 dark:text-blue-300 font-medium mb-2">支持格式</div>
            <div className="text-blue-700 dark:text-blue-400 text-sm">
              支持导入 CSV 或 JSON 格式文件
            </div>
          </div>

          <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6">
            <div className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              <strong>CSV 格式要求：</strong>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-3 rounded mb-4 font-mono">
              问题,答案,标签 ID<br/>
              "什么是微服务？","微服务是...","微服务"<br/>
              "Redis 的使用场景","Redis 主要用于...","Redis"
            </div>
            
            <div className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              <strong>JSON 格式要求：</strong>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-3 rounded mb-6 font-mono">
              [<br/>
              &nbsp;&nbsp;{"{"}"question": "什么是微服务？", "answer": "微服务是...", "tagName": "微服务"{"}"}<br/>
              &nbsp;&nbsp;{"{"}"question": "Redis 的使用场景", "answer": "Redis 主要用于...", "tagName": null{"}"}<br/>
              ]
            </div>

            <Upload
              beforeUpload={handleImportFile}
              showUploadList={false}
              accept=".csv,.json"
            >
              <Button
                icon={<CloudArrowUpIcon className="w-4 h-4" />}
                loading={importing}
                size="large"
                block
              >
                选择文件导入
              </Button>
            </Upload>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              checked={importOverwrite}
              onChange={(e) => setImportOverwrite(e.target.checked)}
            >
              覆盖已存在的题目（相同问题）
            </Checkbox>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="text-yellow-800 dark:text-yellow-300 text-sm">
              <div className="font-medium mb-2">导入说明：</div>
              <ul className="list-disc list-inside space-y-1">
                <li>文件大小限制：最大 10MB</li>
                <li>数量限制：单次最多导入 1000 个题目</li>
                <li>重复检测：基于问题文本进行去重</li>
                <li>标签 ID：可选字段，需要先在系统中创建对应标签</li>
              </ul>
            </div>
          </div>

        </div>
      </DrawerContent>
    </DrawerProvider>
  );
}
