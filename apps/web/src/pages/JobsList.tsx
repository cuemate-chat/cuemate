import { Button, Input } from 'antd';
import { useEffect, useState } from 'react';
import { deleteJob, listJobs, updateJob } from '../api/jobs';
import { message as globalMessage } from '../components/Message';

export default function JobsList() {
  const [items, setItems] = useState<Array<{ id: string; title: string; description: string; created_at: number; resumeTitle?: string; resumeContent?: string }>>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [resumeContent, setResumeContent] = useState('');
  const [loading, setLoading] = useState(false);

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
      setItems((prev) => prev.map((it) => (it.id === selectedId ? { ...it, title, description, resumeContent } : it)));
      globalMessage.success('已保存修改');
    } catch (e: any) {
      globalMessage.error(e?.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      await deleteJob(selectedId);
      const next = items.filter((i) => i.id !== selectedId);
      setItems(next);
      if (next.length) selectJob(next[0].id);
      else {
        setSelectedId(null);
        setTitle(''); setDescription(''); setResumeContent('');
      }
      globalMessage.success('已删除岗位');
    } catch (e: any) {
      globalMessage.error(e?.message || '删除失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* 左侧列表 */}
      <div className="col-span-12 md:col-span-3 min-h-0">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm h-[calc(100vh-175px)] min-h-0 overflow-y-auto">
          <div className="text-sm text-slate-600 mb-2">岗位列表</div>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <button
                key={it.id}
                onClick={() => selectJob(it.id)}
                className={`relative w-full text-left pl-9 pr-3 py-2 rounded border ${selectedId === it.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
              >
                <span className="absolute left-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-5 h-5 rounded bg-slate-200 text-[10px] text-slate-700 font-medium">
                  {idx + 1}
                </span>
                {it.title}
              </button>
            ))}
            {!items.length && <div className="text-xs text-slate-500">暂无岗位</div>}
          </div>
        </div>
      </div>

      {/* 右侧详情 */}
      <div className="col-span-12 md:col-span-9">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <div className="text-sm text-slate-600 mb-1">岗位名称</div>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!selectedId} />
            </div>
            <div>
              <div className="text-sm text-slate-600 mb-1">岗位描述</div>
              <Input.TextArea rows={8} maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} disabled={!selectedId} />
              <div className="text-right text-xs text-slate-500">{description.length} / 5000</div>
            </div>
            <div>
              <div className="text-sm text-slate-600 mb-1">简历信息（文本）</div>
              <Input.TextArea rows={8} maxLength={5000} value={resumeContent} onChange={(e) => setResumeContent(e.target.value)} placeholder="简历正文" disabled={!selectedId} />
              <div className="text-right text-xs text-slate-500">{resumeContent.length} / 5000</div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="mt-6 flex items-center justify-between">
            <Button onClick={() => (window.location.href = '/settings/vector-knowledge')}>去往向量知识库</Button>
            <div className="space-x-3">
              <Button type="primary" disabled={!selectedId || loading} onClick={onSave}>保存修改</Button>
              <Button danger disabled={!selectedId || loading} onClick={onDelete}>删除岗位</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


