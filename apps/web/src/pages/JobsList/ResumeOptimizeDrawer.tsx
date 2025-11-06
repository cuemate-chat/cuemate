import { Button, Input, Modal } from 'antd';
import React, { useState } from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import DrawerProvider, { DrawerContent, DrawerHeader } from '../../components/DrawerProvider';
import { ApplicationIcon, CheckCircleIcon } from '../../components/Icons';

interface ResumeOptimizeDrawerProps {
  open: boolean;
  onClose: () => void;
  optimizeResult: {
    suggestions: string;
    originalResume: string;
    optimizedResume: string;
  } | null;
  tempOriginalResume: string;
  tempOptimizedResume: string;
  onApplyResumeContent: (type: 'original' | 'optimized') => void;
  onTempOriginalChange: (value: string) => void;
  onTempOptimizedChange: (value: string) => void;
}

const ResumeOptimizeDrawer: React.FC<ResumeOptimizeDrawerProps> = ({
  open,
  onClose,
  optimizeResult,
  tempOriginalResume,
  tempOptimizedResume,
  onApplyResumeContent,
  onTempOriginalChange,
  onTempOptimizedChange,
}) => {
  const [viewMode, setViewMode] = useState<'diff' | 'edit'>('diff');

  // 检测深色模式
  const isDarkMode = document.documentElement.classList.contains('dark');

  // 格式化优化建议：如果没有换行符但有编号，自动添加换行
  const formatSuggestions = (text: string): string => {
    if (!text) return '';

    // 如果已经有换行符，直接返回
    if (text.includes('\n')) return text;

    // 检测 "数字." 或 "数字、" 格式的编号，在前面添加换行
    return text
      .replace(/(\d+[.、])/g, '\n$1')
      .trim();
  };

  return (
    <DrawerProvider
      open={open}
      onClose={onClose}
      width="85%"
    >
      <DrawerHeader>简历优化结果</DrawerHeader>
      <DrawerContent>
        {optimizeResult && (
          <div className="space-y-4 h-[70vh] flex flex-col">
            {/* 优化建议 */}
            <div className="flex-shrink-0">
              <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">优化建议</h3>
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 max-h-48 overflow-y-auto">
                <div className="text-sm text-gray-700 dark:text-slate-200 whitespace-pre-wrap">
                  {formatSuggestions(optimizeResult.suggestions)}
                </div>
              </div>
            </div>
            
            {/* 对比内容 */}
            <div className="flex-1 min-h-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">内容对比</h3>
                <div className="flex gap-2">
                  <Button 
                    size="small" 
                    type={viewMode === 'diff' ? 'primary' : 'default'}
                    onClick={() => setViewMode('diff')}
                  >
                    差异对比
                  </Button>
                  <Button 
                    size="small" 
                    type={viewMode === 'edit' ? 'primary' : 'default'}
                    onClick={() => setViewMode('edit')}
                  >
                    编辑模式
                  </Button>
                </div>
              </div>
              
              {/* 颜色说明提示 - 只在差异对比模式显示 */}
              {viewMode === 'diff' && (
                <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="text-xs text-gray-600 dark:text-slate-200 mb-2 font-medium">颜色说明：</div>
                  <div className="flex flex-wrap gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded"></span>
                      <span className="text-red-600 dark:text-red-400">红色背景</span>
                      <span className="text-gray-500 dark:text-slate-300">- 删除的内容</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded"></span>
                      <span className="text-green-600 dark:text-green-400">绿色背景</span>
                      <span className="text-gray-500 dark:text-slate-300">- 新增的内容</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded"></span>
                      <span className="text-yellow-600 dark:text-yellow-400">黄色背景</span>
                      <span className="text-gray-500 dark:text-slate-300">- 修改的词语</span>
                    </div>
                  </div>
                </div>
              )}
              
              {viewMode === 'diff' ? (
                <div className="h-full border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col">
                  {/* 固定标题栏 */}
                  <div className="flex-shrink-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-2">
                    <div className="grid grid-cols-2 gap-4 w-full px-4">
                      <div className="text-sm font-medium text-gray-700 dark:text-slate-200 text-center">优化前</div>
                      <div className="text-sm font-medium text-gray-700 dark:text-slate-200 text-center">优化后</div>
                    </div>
                  </div>
                  {/* 可滚动内容区域 */}
                  <div className="flex-1 min-h-0 overflow-auto">
                    <ReactDiffViewer
                      oldValue={tempOriginalResume}
                      newValue={tempOptimizedResume}
                      splitView={true}
                      showDiffOnly={false}
                      useDarkTheme={isDarkMode}
                      leftTitle=""
                      rightTitle=""
                      styles={{
                        diffContainer: {
                          height: '100%',
                          fontSize: '14px',
                          overflow: 'auto'
                        },
                        diffRemoved: {
                          backgroundColor: isDarkMode ? '#450a0a' : '#fee2e2',
                          color: isDarkMode ? '#fca5a5' : '#dc2626'
                        },
                        diffAdded: {
                          backgroundColor: isDarkMode ? '#052e16' : '#dcfce7',
                          color: isDarkMode ? '#86efac' : '#16a34a'
                        },
                        wordDiff: {
                          backgroundColor: isDarkMode ? '#713f12' : '#fef3c7',
                          color: isDarkMode ? '#fcd34d' : '#d97706'
                        }
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                  {/* 优化前 */}
                  <div className="flex flex-col h-full">
                    {/* 固定头部 */}
                    <div className="flex-shrink-0 flex items-center justify-between mb-2">
                      <div className="text-xs font-medium text-red-600 flex items-center gap-1">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        优化前
                      </div>
                      <Button 
                        size="small" 
                        type="text" 
                        onClick={() => {
                          Modal.confirm({
                            title: '确认应用优化前版本',
                            content: '此操作将用优化前的内容覆盖当前简历，请慎重考虑。确定要应用吗？',
                            okText: '确定应用',
                            okType: 'danger',
                            cancelText: '取消',
                            zIndex: 10000, 
                            onOk: () => onApplyResumeContent('original')
                          });
                        }}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        应用此版本 <ApplicationIcon className="w-4 h-4 inline ml-1" />
                      </Button>
                    </div>
                    {/* 可滚动内容区域 */}
                    <div className="flex-1 min-h-0 flex flex-col">
                      <Input.TextArea
                        value={tempOriginalResume}
                        onChange={(e) => onTempOriginalChange(e.target.value)}
                        className="flex-1 min-h-0 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600 dark:placeholder-slate-400"
                        placeholder="优化前的简历内容"
                        style={{
                          height: '100%',
                          resize: 'none'
                        }}
                      />
                      <div className="flex-shrink-0 text-right text-xs text-slate-500 mt-1">
                        {tempOriginalResume.length} 字
                      </div>
                    </div>
                  </div>
                  
                  {/* 优化后 */}
                  <div className="flex flex-col h-full">
                    {/* 固定头部 */}
                    <div className="flex-shrink-0 flex items-center justify-between mb-2">
                      <div className="text-xs font-medium text-green-600 flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        优化后
                      </div>
                      <Button 
                        size="small" 
                        type="text" 
                        onClick={() => {
                          Modal.confirm({
                            title: '确认应用优化后版本',
                            content: '此操作将用优化后的内容覆盖当前简历，请慎重考虑。确定要应用吗？',
                            okText: '确定应用',
                            okType: 'primary',
                            cancelText: '取消',
                            zIndex: 10000, 
                            onOk: () => onApplyResumeContent('optimized')
                          });
                        }}
                        className="text-xs text-green-600 hover:text-green-700"
                      >
                        应用此版本 <CheckCircleIcon className="w-4 h-4 inline ml-1" />
                      </Button>
                    </div>
                    {/* 可滚动内容区域 */}
                    <div className="flex-1 min-h-0 flex flex-col">
                      <Input.TextArea
                        value={tempOptimizedResume}
                        onChange={(e) => onTempOptimizedChange(e.target.value)}
                        className="flex-1 min-h-0 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600 dark:placeholder-slate-400"
                        placeholder="优化后的简历内容"
                        style={{
                          height: '100%',
                          resize: 'none'
                        }}
                      />
                      <div className="flex-shrink-0 text-right text-xs text-slate-500 mt-1">
                        {tempOptimizedResume.length} 字 / 20000
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DrawerContent>
    </DrawerProvider>
  );
};

export default ResumeOptimizeDrawer;
