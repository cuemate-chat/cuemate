import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button, Input, Modal } from 'antd';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { deleteJob, extractResumeText, listJobs, updateJob, type JobWithResume } from '../../api/jobs';
import { optimizeResumeWithLLM } from '../../api/llm';
import CollapsibleSidebar from '../../components/CollapsibleSidebar';
import FullScreenOverlay from '../../components/FullScreenOverlay';
import { WarningIcon } from '../../components/Icons';
import { message as globalMessage } from '../../components/Message';
import PageLoading from '../../components/PageLoading';
import { useLoading } from '../../hooks/useLoading';
import ResumeOptimizeDrawer from './ResumeOptimizeDrawer';
import UploadResumeDrawer from './UploadResumeDrawer';

export default function JobsList() {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<JobWithResume[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [resumeContent, setResumeContent] = useState('');
  const { loading, start: startLoading, end: endLoading } = useLoading();
  const [adaptiveRows, setAdaptiveRows] = useState<{ desc: number; resume: number }>({ desc: 8, resume: 8 });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { loading: optimizeLoading, start: startOptimize, end: endOptimize } = useLoading();
  const [optimizeModalVisible, setOptimizeModalVisible] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<{
    suggestions: string;
    originalResume: string;
    optimizedResume: string;
  } | null>(null);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [tempOptimizedResume, setTempOptimizedResume] = useState('');
  const [tempOriginalResume, setTempOriginalResume] = useState('');
  // 计算中间可视区域高度：100vh - Header(56px) - Footer(48px) - Main 上下内边距(48px)
  const MAIN_HEIGHT = 'calc(100vh - 56px - 48px - 48px)';

  // 根据屏幕高度自适应文本域行数
  useEffect(() => {
    const recomputeRows = () => {
      const viewportHeight = window.innerHeight;
      // 更细致的屏幕尺寸适配
      if (viewportHeight >= 1080) {
        // 大屏幕：1080p 及以上
        setAdaptiveRows({ desc: 14, resume: 15 });
      } else if (viewportHeight >= 900) {
        // 中大屏幕：900-1080px
        setAdaptiveRows({ desc: 11, resume: 12 });
      } else if (viewportHeight >= 768) {
        // 中屏幕：768-900px
        setAdaptiveRows({ desc: 8, resume: 9 });
      } else {
        // 小屏幕：768px 以下
        setAdaptiveRows({ desc: 7, resume: 8 });
      }
    };
    recomputeRows();
    window.addEventListener('resize', recomputeRows);
    return () => window.removeEventListener('resize', recomputeRows);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      startLoading();
      try {
        const data = await listJobs();
        setItems(data.items || []);
        if (data.items?.length) {
          // 优先选中 URL 参数中指定的 jobId
          const urlSelectedId = searchParams.get('selectedId');
          const targetJob = urlSelectedId
            ? data.items.find(item => item.id === urlSelectedId)
            : data.items[0];

          const jobToSelect = targetJob || data.items[0];
          setSelectedId(jobToSelect.id);
          setTitle(jobToSelect.title || '');
          setDescription(jobToSelect.description || '');
          setResumeContent(jobToSelect.resumeContent || '');
        }
      } catch (error) {
        // error handled by global http client
      } finally {
        await endLoading();
      }
    };
    loadData();
  }, [searchParams, startLoading, endLoading]);

  const selectJob = async (id: string) => {
    setSelectedId(id);
    const found = items.find((i) => i.id === id);
    if (found) {
      setTitle(found.title || '');
      setDescription(found.description || '');
      setResumeContent(found.resumeContent || '');
    }
  };

  const onSave = async () => {
    if (!selectedId) return;
    startLoading();
    try {
      await updateJob(selectedId, { title, description, resumeContent });
      // 更新本地列表缓存
      setItems((prev) =>
        prev.map((it) =>
          it.id === selectedId
            ? { ...it, title, description, resumeContent, vector_status: 1 }
            : it,
        ),
      );
      globalMessage.success('已保存修改');
    } catch (e: any) {
      globalMessage.error(e?.message || '保存失败');
    } finally {
      await endLoading();
    }
  };

  const onDelete = async () => {
    if (!selectedId) return;
    
    // 获取当前选中的岗位信息
    const currentJob = items.find((i) => i.id === selectedId);
    if (!currentJob) return;
    
    // 显示详细的确认对话框
    Modal.confirm({
      title: '确认删除岗位',
      content: (
        <div className="space-y-3">
          <div className="text-red-600 font-medium">
            此操作将永久删除以下所有相关数据，且无法恢复！
          </div>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs">1</span>
              <span>岗位信息：<strong>{currentJob.title}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs">2</span>
              <span>对应的简历数据</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs">3</span>
              <span>对应的面试押题数据</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs">4</span>
              <span>向量库中的所有相关数据</span>
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
            <div className="font-medium mb-1">
              <WarningIcon className="w-4 h-4 inline mr-1" />
              重要提醒：
            </div>
            <div>删除后，所有相关的简历、押题、向量库数据都将被永久清除，请谨慎操作！</div>
          </div>
        </div>
      ),
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      width: 500,
      onOk: async () => {
        startLoading();
        try {
          // 调用级联删除 API
          await deleteJob(selectedId);
          
          // 更新本地状态
          const next = items.filter((i) => i.id !== selectedId);
          setItems(next);
          if (next.length) selectJob(next[0].id);
          else {
            setSelectedId(null);
            setTitle('');
            setDescription('');
            setResumeContent('');
          }
          globalMessage.success('岗位及相关数据已全部删除');
        } catch (e: any) {
          globalMessage.error(e?.message || '删除失败');
        } finally {
          await endLoading();
        }
      },
    });
  };

  // 简历优化功能 - 直接调用 LLM Router
  const onOptimizeResume = async (forceRefresh = false) => {
    if (!selectedId || !resumeContent.trim()) return;
    
    // 如果有缓存且不是强制刷新，直接显示
    if (!forceRefresh && optimizeResult && optimizeResult.originalResume === resumeContent) {
      setTempOriginalResume(optimizeResult.originalResume);
      setTempOptimizedResume(optimizeResult.optimizedResume);
      setOptimizeModalVisible(true);
      return;
    }
    
    startOptimize();
    try {
      // 调用 LLM API
      const result = await optimizeResumeWithLLM({
        jobDescription: description,
        resumeContent: resumeContent,
      });
      
      // 验证优化后简历的长度
      const originalLength = resumeContent.length;
      const optimizedLength = result.optimizedResume.length;
      const minRequiredLength = Math.floor(originalLength * 0.8); // 至少 80%的长度
      
      const newResult = {
        suggestions: result.suggestions,
        originalResume: resumeContent,
        optimizedResume: result.optimizedResume,
      };
      
      setOptimizeResult(newResult);
      setTempOriginalResume(newResult.originalResume);
      setTempOptimizedResume(newResult.optimizedResume);
      setOptimizeModalVisible(true);
      
      // 如果优化后的内容太短，显示警告
      if (optimizedLength < minRequiredLength) {
        globalMessage.warning(`优化后的简历较短（${optimizedLength}字），建议在此基础上补充更多详细信息。原简历${originalLength}字。`);
      }
      
    } catch (error: any) {
      globalMessage.error(error.message || '简历优化失败');
    } finally {
      await endOptimize();
    }
  };

  // 应用简历内容
  const applyResumeContent = (type: 'original' | 'optimized') => {
    const content = type === 'original' ? tempOriginalResume : tempOptimizedResume;
    setResumeContent(content);
    setOptimizeModalVisible(false);
    globalMessage.success(`已应用${type === 'original' ? '优化前' : '优化后'}的简历内容`);
  };

  // 上传简历文件
  const handleFileUpload = async (file: File) => {
    if (!selectedId) {
      globalMessage.error('请先选择一个岗位');
      return false;
    }

    setUploadLoading(true);
    try {
      const result = await extractResumeText(file);
      setResumeContent(result.text);
      setUploadModalVisible(false);
      globalMessage.success(`简历文件 ${file.name} 解析成功`);
    } catch (error: any) {
      globalMessage.error(error.message || '文件解析失败');
    } finally {
      setUploadLoading(false);
    }
    return false; // 阻止默认上传行为
  };

  // 初始加载时显示全屏 loading
  if (loading) {
    return <PageLoading tip="正在加载岗位列表..." />;
  }

  return (
    <div className="flex gap-6 overflow-hidden" style={{ height: MAIN_HEIGHT }}>
      {/* 左侧列表 */}
      <CollapsibleSidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        title="岗位列表"
        className="h-full"
      >
        <div className="p-4 space-y-2 overflow-y-auto h-full">
          {items.map((item, index) => (
            <button
              key={item.id}
              onClick={() => selectJob(item.id)}
              title="点击查看详情"
              className={`relative w-full text-left pl-10 pr-4 py-3 rounded-lg border transition-all duration-200 group ${
                selectedId === item.id
                  ? 'border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm'
                  : 'border-slate-200 hover:border-blue-300 hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50'
              }`}
            >
              <div className={`absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 ${
                selectedId === item.id
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-slate-200 text-slate-600 group-hover:bg-blue-400 group-hover:text-white'
              }`}>
                {index + 1}
              </div>
              <div className={`font-medium transition-colors duration-200 ${
                selectedId === item.id ? 'text-blue-700' : 'text-slate-800 group-hover:text-blue-700'
              }`}>
                {item.title}
              </div>
              {/* 状态指示器 */}
              <div className={`absolute right-3 top-3 w-2 h-2 rounded-full transition-all duration-200 ${
                item.vector_status ? 'bg-green-400 shadow-green-400/50 shadow-sm' : 'bg-amber-400 shadow-amber-400/50 shadow-sm'
              }`}></div>
            </button>
          ))}
          {!items.length && (
            <div className="text-center py-8 text-slate-500">
              <div className="text-sm">暂无岗位</div>
              <div className="text-xs text-slate-400 mt-1">请先创建岗位</div>
            </div>
          )}
        </div>
      </CollapsibleSidebar>
      
      {/* 右侧详情 */}
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm h-full overflow-auto">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <div className="text-sm text-slate-600 mb-1">岗位名称<span className="text-red-500"> *</span></div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!selectedId}
              />
            </div>
            <div>
              <div className="text-sm text-slate-600 mb-1">岗位描述<span className="text-red-500"> *</span></div>
              <Input.TextArea
                rows={adaptiveRows.desc}
                maxLength={5000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!selectedId}
              />
              <div className="text-right text-xs text-slate-500">{description.length} / 5000</div>
            </div>
            <div>
              <div className="text-sm text-slate-600 mb-1">简历信息（文本）<span className="text-red-500"> *</span></div>
              <Input.TextArea
                rows={adaptiveRows.resume}
                maxLength={20000}
                value={resumeContent}
                onChange={(e) => setResumeContent(e.target.value)}
                placeholder="简历正文"
                disabled={!selectedId}
              />
              <div className="text-right text-xs text-slate-500">{resumeContent.length} / 20000</div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="mt-6 space-y-4">
            {/* 功能按钮行 */}
            <div className="flex flex-wrap items-center gap-3">
              <Button 
                onClick={() => (window.location.href = '/settings/vector-knowledge')}
                className="shrink-0"
              >
                <span className="hidden sm:inline">去往向量知识库</span>
                <span className="sm:hidden">向量库</span>
              </Button>
              <Button 
                disabled={!selectedId}
                onClick={() => setUploadModalVisible(true)}
                className="shrink-0"
              >
                <span className="hidden sm:inline">上传简历</span>
                <span className="sm:hidden">上传</span>
              </Button>
              <Button 
                disabled={!selectedId || !resumeContent.trim() || optimizeLoading} 
                loading={optimizeLoading}
                onClick={() => onOptimizeResume()}
                className="shrink-0"
              >
                {optimizeLoading ? (
                  <>
                    <span className="hidden sm:inline">优化中...</span>
                    <span className="sm:hidden">优化中...</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">简历优化</span>
                    <span className="sm:hidden">优化</span>
                  </>
                )}
              </Button>
            </div>

            {/* 状态提示行 */}
            {selectedId && (
              <div className="flex items-start gap-2 text-xs">
                {items.find((i) => i.id === selectedId)?.vector_status ? (
                  <>
                    <CheckCircleIcon className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-green-600 font-medium">
                      已同步到向量库
                    </span>
                  </>
                ) : (
                  <>
                    <ExclamationTriangleIcon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span className="text-red-500">
                      <span className="hidden sm:inline">未同步到向量库，点击保存修改按钮即可同步至向量库</span>
                      <span className="sm:hidden">未同步，点击保存即可同步</span>
                    </span>
                  </>
                )}
              </div>
            )}

            {/* 主要操作按钮行 */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
              <Button 
                type="primary" 
                disabled={!selectedId || loading} 
                onClick={onSave}
                className="shrink-0"
              >
                保存修改
              </Button>
              <Button 
                danger 
                disabled={!selectedId || loading} 
                onClick={onDelete}
                className="shrink-0"
              >
                删除岗位
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* 上传简历侧拉弹框 */}
      <UploadResumeDrawer
        open={uploadModalVisible}
        onClose={() => setUploadModalVisible(false)}
        onFileUpload={handleFileUpload}
        uploadLoading={uploadLoading}
      />
      
      {/* 简历优化侧拉弹框 */}
      <ResumeOptimizeDrawer
        open={optimizeModalVisible}
        onClose={() => setOptimizeModalVisible(false)}
        optimizeResult={optimizeResult}
        tempOriginalResume={tempOriginalResume}
        tempOptimizedResume={tempOptimizedResume}
        onApplyResumeContent={applyResumeContent}
        onTempOriginalChange={setTempOriginalResume}
        onTempOptimizedChange={setTempOptimizedResume}
      />

      {/* 全屏遮罩组件 - 简历优化 */}
      <FullScreenOverlay
        visible={optimizeLoading}
        title="正在优化简历"
        subtitle="AI 正在根据岗位要求优化您的简历，请稍候..."
        type="loading"
      />
    </div>
  );
}
