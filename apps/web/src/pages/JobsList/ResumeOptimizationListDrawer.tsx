import { Button, Modal, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { deleteResumeOptimization, listResumeOptimizations, type ResumeOptimization } from '../../api/jobs';
import DrawerProvider, { DrawerContent, DrawerFooter, DrawerHeader } from '../../components/DrawerProvider';
import { message as globalMessage } from '../../components/Message';
import ResumeOptimizeDrawerLevel2 from './ResumeOptimizeDrawerLevel2';

interface ResumeOptimizationListDrawerProps {
  open: boolean;
  onClose: () => void;
  jobId: string;
  jobDescription: string;
  onCreateNew: () => void;
  onOptimizationCreated: (optimization: ResumeOptimization) => void;
  onApplyResume?: (content: string) => void;
}

export default function ResumeOptimizationListDrawer({
  open,
  onClose,
  jobId,
  jobDescription,
  onCreateNew,
  onOptimizationCreated: _onOptimizationCreated,
  onApplyResume,
}: ResumeOptimizationListDrawerProps) {
  const [optimizations, setOptimizations] = useState<ResumeOptimization[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOptimization, setSelectedOptimization] = useState<ResumeOptimization | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // 加载简历优化记录列表
  useEffect(() => {
    if (open && jobId) {
      loadOptimizations();
    }
  }, [open, jobId]);

  const loadOptimizations = async () => {
    setLoading(true);
    try {
      const data = await listResumeOptimizations(jobId);
      setOptimizations(data.items || []);
    } catch (error: any) {
      globalMessage.error(error?.message || '加载简历优化记录失败');
    } finally {
      setLoading(false);
    }
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // 获取状态标签
  const getStatusTag = (status: string) => {
    const statusMap = {
      pending: { text: '等待中', color: 'default' },
      processing: { text: '优化中', color: 'processing' },
      completed: { text: '已完成', color: 'success' },
      failed: { text: '失败', color: 'error' },
    };
    const config = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 查看详情
  const handleViewDetail = (optimization: ResumeOptimization) => {
    setSelectedOptimization(optimization);
    setDetailDrawerOpen(true);
  };

  // 关闭详情抽屉
  const handleCloseDetailDrawer = () => {
    setDetailDrawerOpen(false);
    setSelectedOptimization(null);
  };

  // 关闭所有抽屉
  const handleCloseAll = () => {
    setDetailDrawerOpen(false);
    setSelectedOptimization(null);
    onClose();
  };

  // 删除优化记录
  const handleDeleteOptimization = (e: React.MouseEvent, optimization: ResumeOptimization) => {
    e.stopPropagation();
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除这条优化记录吗？此操作不可恢复。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      zIndex: 10000,
      onOk: async () => {
        setDeleteLoading(optimization.id);
        try {
          await deleteResumeOptimization(optimization.id);
          globalMessage.success('删除成功');
          loadOptimizations();
        } catch (error: any) {
          globalMessage.error(error?.message || '删除失败');
        } finally {
          setDeleteLoading(null);
        }
      },
    });
  };

  return (
    <>
      <DrawerProvider open={open} onClose={onClose} width="85%">
        <DrawerHeader>
          <div className="flex items-center justify-between w-full">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">简历优化记录</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">共 {optimizations.length} 条记录</p>
            </div>
            <Button type="primary" onClick={onCreateNew}>
              新建优化简历
            </Button>
          </div>
        </DrawerHeader>
        <DrawerContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
              <span className="text-slate-600 dark:text-slate-300">加载中...</span>
            </div>
          ) : optimizations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
              <svg className="w-16 h-16 mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-medium">暂无优化记录</p>
              <p className="text-sm mt-2">点击"新建优化简历"开始优化</p>
            </div>
          ) : (
            <div className="space-y-4">
              {optimizations.map((optimization, index) => (
                <div
                  key={optimization.id}
                  onClick={() => handleViewDetail(optimization)}
                  className="group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-lg transition-all duration-200 cursor-pointer"
                >
                  {/* 序号角标 */}
                  <div className="absolute -top-2 -left-2">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
                      #{index + 1}
                    </div>
                  </div>

                  {/* 主要内容 */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-4">
                      {/* 标题行 */}
                      <div className="flex items-center gap-3 mb-3">
                        {getStatusTag(optimization.status)}
                        {optimization.modelName && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            模型: {optimization.modelName}
                          </span>
                        )}
                        {optimization.optimizationCount > 0 && (
                          <span className="text-xs text-amber-600 dark:text-amber-400">
                            已优化 {optimization.optimizationCount} 次
                          </span>
                        )}
                      </div>

                      {/* 字数统计 */}
                      <div className="flex items-center gap-6 text-sm mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600 dark:text-slate-400">优化前:</span>
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {optimization.originalWordCount} 字
                          </span>
                        </div>
                        {optimization.optimizedWordCount > 0 && (
                          <>
                            <span className="text-slate-400">→</span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-600 dark:text-slate-400">优化后:</span>
                              <span className="font-medium text-green-600 dark:text-green-400">
                                {optimization.optimizedWordCount} 字
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* 建议预览 */}
                      {optimization.suggestion && (
                        <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-2">
                          {optimization.suggestion}
                        </div>
                      )}

                      {/* 错误信息 */}
                      {optimization.errorMessage && (
                        <div className="text-xs text-red-600 dark:text-red-400 mt-2">
                          错误: {optimization.errorMessage}
                        </div>
                      )}
                    </div>

                    {/* 右侧时间 */}
                    <div className="flex-shrink-0 text-right">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(optimization.createdAt)}
                      </div>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    <span className="text-xs text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      点击查看详情 →
                    </span>
                    <Button
                      size="small"
                      danger
                      loading={deleteLoading === optimization.id}
                      onClick={(e) => handleDeleteOptimization(e, optimization)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      删除
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DrawerContent>
        <DrawerFooter>
          <div className="flex justify-end w-full">
            <Button onClick={onClose}>关闭</Button>
          </div>
        </DrawerFooter>
      </DrawerProvider>

      {/* 二级抽屉 - 优化详情 */}
      {selectedOptimization && (
        <ResumeOptimizeDrawerLevel2
          open={detailDrawerOpen}
          onClose={handleCloseDetailDrawer}
          optimization={selectedOptimization}
          onBack={handleCloseDetailDrawer}
          jobId={jobId}
          jobDescription={jobDescription}
          onOptimizationCreated={(newOptimization) => {
            // 刷新列表
            loadOptimizations();
            // 显示新创建的优化记录
            setSelectedOptimization(newOptimization);
          }}
          onApplyResume={onApplyResume}
          onCloseAll={handleCloseAll}
        />
      )}
    </>
  );
}
