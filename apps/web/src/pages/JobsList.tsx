import { Button, Input, Modal } from 'antd';
import { useEffect, useState } from 'react';
import { deleteJob, listJobs, updateJob, type JobWithResume } from '../api/jobs';
import { message as globalMessage } from '../components/Message';

export default function JobsList() {
  const [items, setItems] = useState<JobWithResume[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [resumeContent, setResumeContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [adaptiveRows, setAdaptiveRows] = useState<number>(8);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // 计算中间可视区域高度：100vh - Header(56px) - Footer(48px) - Main上下内边距(48px)
  const MAIN_HEIGHT = 'calc(100vh - 56px - 48px - 48px)';

  // 根据屏幕高度自适应文本域行数：14"≈8行，27"≈11行
  useEffect(() => {
    const recomputeRows = () => {
      const viewportHeight = window.innerHeight;
      const rows = viewportHeight >= 900 ? 11 : viewportHeight >= 800 ? 8 : 7;
      setAdaptiveRows(rows);
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
            <div className="font-medium mb-1">⚠️ 重要提醒：</div>
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

  return (
    <div className="flex gap-6 overflow-hidden" style={{ height: MAIN_HEIGHT }}>
      {/* 左侧列表 */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'w-0' : 'w-80'} flex-shrink-0 min-h-0 h-full relative`}>
        {!sidebarCollapsed && (
          <div className="rounded-lg border border-slate-200 overflow-hidden h-full">
            <div className="px-4 py-3 bg-slate-50 text-slate-600">岗位列表</div>
            <div className="p-3 space-y-2 overflow-y-auto h-[calc(100%-60px)]">
              {items.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => selectJob(item.id)}
                  className={`w-full text-left px-3 py-2 rounded border transition-all ${
                    selectedId === item.id
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {index + 1} {item.title}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* 折叠按钮 */}
        <div className={`absolute ${sidebarCollapsed ? '-right-6' : '-right-6'} top-1/2 transform -translate-y-1/2 z-10`}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-8 h-8 bg-white border-2 border-slate-300 rounded-full shadow-lg flex items-center justify-center hover:bg-slate-50 hover:border-blue-400 transition-all duration-200 group"
            title={sidebarCollapsed ? '展开岗位列表' : '折叠岗位列表'}
          >
            <svg
              className={`w-4 h-4 text-slate-600 group-hover:text-blue-600 transition-all duration-200 ${
                sidebarCollapsed ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* 右侧详情 */}
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm h-full overflow-auto">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <div className="text-sm text-slate-600 mb-1">岗位名称</div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!selectedId}
              />
            </div>
            <div>
              <div className="text-sm text-slate-600 mb-1">岗位描述</div>
              <Input.TextArea
                rows={adaptiveRows}
                maxLength={5000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!selectedId}
              />
              <div className="text-right text-xs text-slate-500">{description.length} / 5000</div>
            </div>
            <div>
              <div className="text-sm text-slate-600 mb-1">简历信息（文本）</div>
              <Input.TextArea
                rows={adaptiveRows}
                maxLength={5000}
                value={resumeContent}
                onChange={(e) => setResumeContent(e.target.value)}
                placeholder="简历正文"
                disabled={!selectedId}
              />
              <div className="text-right text-xs text-slate-500">{resumeContent.length} / 5000</div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button onClick={() => (window.location.href = '/settings/vector-knowledge')}>
                去往向量知识库
              </Button>
              {selectedId && (
                <span className="text-xs text-red-500">
                  {items.find((i) => i.id === selectedId)?.vector_status
                    ? '已同步到向量库'
                    : '未同步到向量库，点击保存修改按钮即可同步至向量库'}
                </span>
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
    </div>
  );
}
