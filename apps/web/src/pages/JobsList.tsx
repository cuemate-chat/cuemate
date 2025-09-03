import { InboxOutlined } from '@ant-design/icons';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button, Input, Modal, Upload } from 'antd';
import { useEffect, useState } from 'react';
import { http } from '../api/http';
import { deleteJob, extractResumeText, listJobs, updateJob, type JobWithResume } from '../api/jobs';
import CollapsibleSidebar from '../components/CollapsibleSidebar';
import FullScreenOverlay from '../components/FullScreenOverlay';
import { ApplicationIcon, LightbulbIcon, WarningIcon } from '../components/Icons';
import { message as globalMessage } from '../components/Message';


export default function JobsList() {
  const [items, setItems] = useState<JobWithResume[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [resumeContent, setResumeContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [adaptiveRows, setAdaptiveRows] = useState<{ desc: number; resume: number }>({ desc: 8, resume: 8 });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [optimizeLoading, setOptimizeLoading] = useState(false);
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
  // 计算中间可视区域高度：100vh - Header(56px) - Footer(48px) - Main上下内边距(48px)
  const MAIN_HEIGHT = 'calc(100vh - 56px - 48px - 48px)';

  // 根据屏幕高度自适应文本域行数
  useEffect(() => {
    const recomputeRows = () => {
      const viewportHeight = window.innerHeight;
      // 更细致的屏幕尺寸适配
      if (viewportHeight >= 1080) {
        // 大屏幕：1080p及以上
        setAdaptiveRows({ desc: 14, resume: 15 });
      } else if (viewportHeight >= 900) {
        // 中大屏幕：900-1080px
        setAdaptiveRows({ desc: 11, resume: 12 });
      } else if (viewportHeight >= 768) {
        // 中屏幕：768-900px
        setAdaptiveRows({ desc: 8, resume: 9 });
      } else {
        // 小屏幕：768px以下
        setAdaptiveRows({ desc: 7, resume: 8 });
      }
    };
    recomputeRows();
    window.addEventListener('resize', recomputeRows);
    return () => window.removeEventListener('resize', recomputeRows);
  }, []);

  useEffect(() => {
    (async () => {
      const data = await listJobs();
      setItems(data.items || []);
      if (data.items?.length) {
        // 默认选中第一条
        const first = data.items[0];
        setSelectedId(first.id);
        setTitle(first.title || '');
        setDescription(first.description || '');
        setResumeContent(first.resumeContent || '');
      }
    })();
  }, []);

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
    setLoading(true);
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
      setLoading(false);
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
        setLoading(true);
        try {
          // 调用级联删除API
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
          setLoading(false);
        }
      },
    });
  };

  // 简历优化功能
  const onOptimizeResume = async (forceRefresh = false) => {
    if (!selectedId || !resumeContent.trim()) return;
    
    // 如果有缓存且不是强制刷新，直接显示
    if (!forceRefresh && optimizeResult && optimizeResult.originalResume === resumeContent) {
      setTempOriginalResume(optimizeResult.originalResume);
      setTempOptimizedResume(optimizeResult.optimizedResume);
      setOptimizeModalVisible(true);
      return;
    }
    
    setOptimizeLoading(true);
    try {
      // 获取当前用户的模型配置
      const userData = await http.get<{ user: any }>('/auth/me');
      const selectedModelId = userData.user.selected_model_id;
      
      if (!selectedModelId) {
        throw new Error('请先在设置中配置大模型');
      }
      
      // 调用LLM进行简历优化
      const result = await http.post<{
        success: boolean;
        suggestions: string;
        optimizedResume: string;
        warning?: string;
      }>('/jobs/optimize-resume', {
        jobId: selectedId,
        resumeContent: resumeContent,
        jobDescription: description,
      });
      
      const newResult = {
        suggestions: result.suggestions,
        originalResume: resumeContent,
        optimizedResume: result.optimizedResume,
      };
      
      setOptimizeResult(newResult);
      setTempOriginalResume(newResult.originalResume);
      setTempOptimizedResume(newResult.optimizedResume);
      setOptimizeModalVisible(true);
      
      // 如果有警告信息，显示警告
      if (result.warning) {
        globalMessage.warning(result.warning); // 显示警告
      }
      
    } catch (error: any) {
      globalMessage.error(error.message || '简历优化失败');
    } finally {
      setOptimizeLoading(false);
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
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <Button onClick={() => (window.location.href = '/settings/vector-knowledge')}>
                  去往向量知识库
                </Button>
                <Button 
                  disabled={!selectedId}
                  onClick={() => setUploadModalVisible(true)}
                >
                  上传简历
                </Button>
                <Button 
                  disabled={!selectedId || !resumeContent.trim() || optimizeLoading} 
                  loading={optimizeLoading}
                  onClick={() => onOptimizeResume()}
                >
                  {optimizeLoading ? '优化中...' : '简历优化'}
                </Button>
              </div>
              {selectedId && (
                <div className="flex items-center gap-2">
                  {items.find((i) => i.id === selectedId)?.vector_status ? (
                    <>
                      <CheckCircleIcon className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-green-600 font-medium">
                        已同步到向量库
                      </span>
                    </>
                  ) : (
                    <>
                      <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                      <span className="text-xs text-red-500">
                        未同步到向量库，点击保存修改按钮即可同步至向量库
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="space-x-3">
              <Button type="primary" disabled={!selectedId || loading} onClick={onSave}>
                保存修改
              </Button>
              <Button danger disabled={!selectedId || loading} onClick={onDelete}>
                删除岗位
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* 简历优化结果弹窗 */}
      <Modal
        title="简历优化结果"
        open={optimizeModalVisible}
        onCancel={() => setOptimizeModalVisible(false)}
        width={1200}
        style={{ height: '80vh' }}
        footer={
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-500">
                              <LightbulbIcon className="w-4 h-4 inline mr-1" />
                提示：您可以编辑下方简历内容，然后选择应用哪个版本
            </div>
            <div className="flex gap-3 mr-12">
              <Button onClick={() => setOptimizeModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" 
                loading={optimizeLoading}
                onClick={() => onOptimizeResume(true)}
              >
                重新优化
              </Button>
            </div>
          </div>
        }
      >
        {optimizeResult && (
          <div className="space-y-4 h-[70vh] flex flex-col">
            {/* 优化建议 */}
            <div className="flex-shrink-0">
              <h3 className="text-sm font-medium text-slate-900 mb-2">优化建议</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-h-32 overflow-y-auto">
                <div className="text-sm text-blue-800 whitespace-pre-wrap">
                  {optimizeResult.suggestions}
                </div>
              </div>
            </div>
            
            {/* 对比内容 */}
            <div className="flex-1 min-h-0">
              <h3 className="text-sm font-medium text-slate-900 mb-3">内容对比（可编辑）</h3>
              <div className="grid grid-cols-2 gap-4 h-full">
                {/* 优化前 */}
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-2">
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
                          onOk: () => applyResumeContent('original')
                        });
                      }}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      应用此版本 <ApplicationIcon className="w-4 h-4 inline ml-1" />
                    </Button>
                  </div>
                  <Input.TextArea
                    value={tempOriginalResume}
                    onChange={(e) => setTempOriginalResume(e.target.value)}
                    className="flex-1 min-h-0"
                    placeholder="优化前的简历内容"
                    style={{ 
                      height: '100%',
                      resize: 'none'
                    }}
                  />
                  <div className="text-right text-xs text-slate-500 mt-1">
                    {tempOriginalResume.length} 字
                  </div>
                </div>
                
                {/* 优化后 */}
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-2">
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
                          onOk: () => applyResumeContent('optimized')
                        });
                      }}
                      className="text-xs text-green-600 hover:text-green-700"
                    >
                      应用此版本 ✅
                    </Button>
                  </div>
                  <Input.TextArea
                    value={tempOptimizedResume}
                    onChange={(e) => setTempOptimizedResume(e.target.value)}
                    className="flex-1 min-h-0"
                    placeholder="优化后的简历内容"
                    style={{ 
                      height: '100%',
                      resize: 'none'
                    }}
                  />
                  <div className="text-right text-xs text-slate-500 mt-1">
                    {tempOptimizedResume.length} 字 / 20000
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
      
      {/* 上传简历弹窗 */}
      <Modal
        title="上传简历文件"
        open={uploadModalVisible}
        onCancel={() => setUploadModalVisible(false)}
        width={600}
        footer={
          <div className="flex justify-end gap-3">
            <Button onClick={() => setUploadModalVisible(false)}>
              取消
            </Button>
          </div>
        }
      >
        <div className="py-4">
          <Upload.Dragger
            name="file"
            multiple={false}
            accept=".pdf,.doc,.docx"
            beforeUpload={handleFileUpload}
            showUploadList={false}
            className="mb-4"
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">
              支持 PDF、DOC、DOCX 格式的简历文件，文件将自动解析为文本并填入简历信息栏
            </p>
          </Upload.Dragger>
          
          {uploadLoading && (
            <div className="text-center text-blue-600">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              正在解析文件内容...
            </div>
          )}
        </div>
      </Modal>
      
      {/* 全屏遮罩组件 - 简历优化 */}
      <FullScreenOverlay
        visible={optimizeLoading}
        title="正在优化简历"
        subtitle="AI正在根据岗位要求优化您的简历，请稍候..."
        type="loading"
      />
    </div>
  );
}
