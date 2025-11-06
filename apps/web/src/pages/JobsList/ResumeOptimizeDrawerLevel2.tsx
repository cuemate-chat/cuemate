import { Button, Input, Modal } from 'antd';
import { useState } from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { createResumeOptimization, getResumeOptimization, type ResumeOptimization } from '../../api/jobs';
import { optimizeResumeWithLLM } from '../../api/llm';
import DrawerProviderLevel2, { DrawerContent, DrawerFooter, DrawerHeader } from '../../components/DrawerProviderLevel2';
import { ApplicationIcon, CheckCircleIcon } from '../../components/Icons';
import { message as globalMessage } from '../../components/Message';
import { useLoading } from '../../hooks/useLoading';

interface ResumeOptimizeDrawerLevel2Props {
  open: boolean;
  onClose: () => void;
  optimization: ResumeOptimization;
  onBack: () => void;
  jobId?: string;
  jobDescription?: string;
  onOptimizationCreated?: (optimization: ResumeOptimization) => void;
}

const ResumeOptimizeDrawerLevel2: React.FC<ResumeOptimizeDrawerLevel2Props> = ({
  open,
  onClose,
  optimization,
  onBack,
  jobId,
  jobDescription,
  onOptimizationCreated,
}) => {
  const [viewMode, setViewMode] = useState<'diff' | 'edit'>('diff');
  const [tempOriginalResume, setTempOriginalResume] = useState(optimization.original_resume);
  const [tempOptimizedResume, setTempOptimizedResume] = useState(optimization.optimized_resume || '');
  const { loading: optimizeLoading, start: startOptimize, end: endOptimize } = useLoading();

  // 检测深色模式
  const isDarkMode = document.documentElement.classList.contains('dark');

  // 格式化优化建议
  const formatSuggestions = (text: string | null): string => {
    if (!text) return '';
    if (text.includes('\n')) return text;
    return text.replace(/(\d+[.、])/g, '\n$1').trim();
  };

  // 应用简历内容
  const handleApplyResumeContent = (type: 'original' | 'optimized') => {
    // TODO: 实现应用简历内容到岗位的逻辑
    console.log('应用简历内容:', type);
  };

  // 新建简历优化
  const handleCreateNewOptimization = async () => {
    if (!jobId || !jobDescription || !tempOptimizedResume) {
      globalMessage.error('缺少必要参数，无法创建新优化');
      return;
    }

    startOptimize();
    try {
      // 使用当前优化后的简历作为新的原始简历
      const result = await optimizeResumeWithLLM({
        jobDescription: jobDescription,
        resumeContent: tempOptimizedResume,
      });

      // 保存新的优化记录到数据库
      const { optimizationId } = await createResumeOptimization(jobId, {
        originalResume: tempOptimizedResume,
        optimizedResume: result.optimizedResume,
        suggestion: result.suggestions,
        status: 'completed',
      });

      globalMessage.success('新的简历优化完成');

      // 从数据库查询刚保存的记录
      const { optimization: newOptimization } = await getResumeOptimization(optimizationId);

      // 通知父组件刷新列表并显示新记录
      if (onOptimizationCreated) {
        onOptimizationCreated(newOptimization);
      }

      // 关闭当前弹框
      onClose();
    } catch (error: any) {
      globalMessage.error(error.message || '简历优化失败');

      // 即使优化失败，也保存失败记录
      try {
        await createResumeOptimization(jobId, {
          originalResume: tempOptimizedResume,
          status: 'failed',
          errorMessage: error.message || '未知错误',
        });
      } catch (dbError) {
        // 忽略数据库保存错误
      }
    } finally {
      endOptimize();
    }
  };

  return (
    <DrawerProviderLevel2
      open={open}
      onClose={onClose}
      width="80%"
    >
      <DrawerHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <button
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors"
              onClick={onBack}
            >
              ← 返回列表
            </button>
            <span className="text-slate-400">|</span>
            <span className="font-medium">简历优化详情</span>
          </div>
          {jobId && jobDescription && (
            <Button
              type="primary"
              onClick={handleCreateNewOptimization}
              loading={optimizeLoading}
              disabled={!tempOptimizedResume}
            >
              新建简历优化
            </Button>
          )}
        </div>
      </DrawerHeader>
      <DrawerContent>
        <div className="space-y-4 h-[70vh] flex flex-col">
          {/* 优化建议 */}
          <div className="flex-shrink-0">
            <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">优化建议</h3>
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 max-h-48 overflow-y-auto">
              <div className="text-sm text-gray-700 dark:text-slate-200 whitespace-pre-wrap">
                {formatSuggestions(optimization.suggestion)}
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

            {/* 颜色说明提示 */}
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
                <div className="flex-shrink-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-2">
                  <div className="grid grid-cols-2 gap-4 w-full px-4">
                    <div className="text-sm font-medium text-gray-700 dark:text-slate-200 text-center">
                      优化前 - {tempOriginalResume.length} 字
                    </div>
                    <div className="text-sm font-medium text-gray-700 dark:text-slate-200 text-center">
                      优化后 - {tempOptimizedResume.length} 字
                    </div>
                  </div>
                </div>
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
                  <div className="flex-shrink-0 flex items-center justify-between mb-2">
                    <div className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      优化前 - {tempOriginalResume.length} 字
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
                          onOk: () => handleApplyResumeContent('original')
                        });
                      }}
                      className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                    >
                      应用此版本 <ApplicationIcon className="w-4 h-4 inline ml-1" />
                    </Button>
                  </div>
                  <div className="flex-1 min-h-0 flex flex-col">
                    <Input.TextArea
                      value={tempOriginalResume}
                      onChange={(e) => setTempOriginalResume(e.target.value)}
                      className="flex-1 min-h-0 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600 dark:placeholder-slate-400"
                      placeholder="优化前的简历内容"
                      style={{
                        height: '100%',
                        resize: 'none'
                      }}
                    />
                    <div className="flex-shrink-0 text-right text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {tempOriginalResume.length} 字
                    </div>
                  </div>
                </div>

                {/* 优化后 */}
                <div className="flex flex-col h-full">
                  <div className="flex-shrink-0 flex items-center justify-between mb-2">
                    <div className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      优化后 - {tempOptimizedResume.length} 字
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
                          onOk: () => handleApplyResumeContent('optimized')
                        });
                      }}
                      className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                    >
                      应用此版本 <CheckCircleIcon className="w-4 h-4 inline ml-1" />
                    </Button>
                  </div>
                  <div className="flex-1 min-h-0 flex flex-col">
                    <Input.TextArea
                      value={tempOptimizedResume}
                      onChange={(e) => setTempOptimizedResume(e.target.value)}
                      className="flex-1 min-h-0 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600 dark:placeholder-slate-400"
                      placeholder="优化后的简历内容"
                      style={{
                        height: '100%',
                        resize: 'none'
                      }}
                    />
                    <div className="flex-shrink-0 text-right text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {tempOptimizedResume.length} 字 / 20000
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
      <DrawerFooter>
        <div className="flex justify-between items-center w-full">
          <Button onClick={onBack}>返回列表</Button>
          <Button type="primary" onClick={onClose}>关闭</Button>
        </div>
      </DrawerFooter>
    </DrawerProviderLevel2>
  );
};

export default ResumeOptimizeDrawerLevel2;
