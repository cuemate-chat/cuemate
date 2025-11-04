import { CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { Button, Checkbox, Upload, message } from 'antd';
import { useState } from 'react';
import { batchImportPresetQuestions } from '../../api/preset-questions';
import DrawerProvider, { DrawerContent, DrawerHeader } from '../../components/DrawerProvider';
import { message as globalMessage } from '../../components/Message';

interface BatchImportDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BatchImportDrawer({
  open,
  onClose,
  onSuccess
}: BatchImportDrawerProps) {
  const [importOverwrite, setImportOverwrite] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  // 批量导入处理
  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setImportLoading(true);
        let questions: Array<{ question: string; answer: string; tag_id?: string | null }> = [];
        
        if (file.name.endsWith('.json')) {
          // JSON 格式导入
          const data = JSON.parse(e.target?.result as string);
          if (Array.isArray(data)) {
            questions = data.map((item: any) => ({
              question: String(item.question || '').trim(),
              answer: String(item.answer || '').trim(),
              tag_id: item.tag_id || null,
            })).filter(item => item.question && item.answer);
          }
        } else if (file.name.endsWith('.csv')) {
          // CSV 格式导入
          const csvText = e.target?.result as string;
          const lines = csvText.split('\n').map(line => line.trim()).filter(line => line);
          
          // 跳过表头
          for (let i = 1; i < lines.length; i++) {
            const columns = lines[i].split(',').map(col => col.trim().replace(/^"|"$/g, ''));
            if (columns.length >= 2 && columns[0] && columns[1]) {
              questions.push({
                question: columns[0],
                answer: columns[1],
                tag_id: columns[2] || null,
              });
            }
          }
        }
        
        if (questions.length === 0) {
          globalMessage.warning('未找到有效的题目数据，请检查文件格式');
          return;
        }
        
        const result = await batchImportPresetQuestions({
          questions,
          overwrite: importOverwrite,
        });
        
        globalMessage.success(
          `批量导入完成！新增 ${result.importedCount} 个，跳过 ${result.skippedCount} 个${result.errors?.length ? `，错误 ${result.errors.length} 个` : ''}`
        );
        
        if (result.errors && result.errors.length > 0) {
          message.warning('导入错误：' + result.errors);
        }
        
        setImportOverwrite(false);
        onSuccess();
      } catch (e: any) {
        globalMessage.error(e?.message || '导入失败');
      } finally {
        setImportLoading(false);
      }
    };
    
    reader.onerror = () => {
      globalMessage.error('文件读取失败');
      setImportLoading(false);
    };
    
    reader.readAsText(file);
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
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-blue-800 font-medium mb-2">支持格式</div>
            <div className="text-blue-700 text-sm">
              支持导入 CSV 或 JSON 格式文件
            </div>
          </div>
          
          <div className="border border-dashed border-slate-300 rounded-lg p-6">
            <div className="text-sm text-slate-600 mb-4">
              <strong>CSV 格式要求：</strong>
            </div>
            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded mb-4 font-mono">
              问题,答案,标签 ID<br/>
              "什么是微服务？","微服务是...","tag_001"<br/>
              "Redis 的使用场景","Redis 主要用于...","tag_002"
            </div>
            
            <div className="text-sm text-slate-600 mb-4">
              <strong>JSON 格式要求：</strong>
            </div>
            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded mb-6 font-mono">
              [<br/>
              &nbsp;&nbsp;{"{"}"question": "什么是微服务？", "answer": "微服务是...", "tag_id": "tag_001"{"}"}<br/>
              &nbsp;&nbsp;{"{"}"question": "Redis 的使用场景", "answer": "Redis 主要用于...", "tag_id": null{"}"}<br/>
              ]
            </div>

            <Upload
              beforeUpload={handleImportFile}
              showUploadList={false}
              accept=".csv,.json"
            >
              <Button 
                icon={<CloudArrowUpIcon className="w-4 h-4" />}
                loading={importLoading}
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

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-yellow-800 text-sm">
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
