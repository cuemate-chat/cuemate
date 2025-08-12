import { Button, Card, Input, Modal, Pagination, Select, Spin } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { listJobs } from '../api/jobs';
import { deleteInterviewQuestion, listInterviewQuestions, updateInterviewQuestion } from '../api/questions';

export default function Prompts() {
  const [jobs, setJobs] = useState<Array<{ id: string; title: string }>>([]);
  const [jobId, setJobId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  useEffect(() => {
    (async () => {
      const data = await listJobs();
      const js = (data.items || []).map((j: any) => ({ id: j.id, title: j.title }));
      setJobs(js);
      if (js.length) setJobId(js[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!jobId) return;
    (async () => {
      setLoading(true);
      try {
        const data = await listInterviewQuestions(jobId, page, pageSize);
        setItems(data.items || []);
        setTotal(data.total || 0);
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId, page]);

  const openModal = (it: any) => {
    setCurrent(it);
    setEditTitle(it.title || '');
    setEditDesc(it.description || '');
    setOpen(true);
  };

  const onSave = async () => {
    if (!current) return;
    await updateInterviewQuestion(current.id, { title: editTitle, description: editDesc });
    setOpen(false);
    // 刷新
    const data = await listInterviewQuestions(jobId!, page, pageSize);
    setItems(data.items || []);
    setTotal(data.total || 0);
  };

  const onDelete = async () => {
    if (!current) return;
    await deleteInterviewQuestion(current.id);
    setOpen(false);
    // 刷新
    const data = await listInterviewQuestions(jobId!, page, pageSize);
    setItems(data.items || []);
    setTotal(data.total || 0);
  };

  const jobOptions = useMemo(() => jobs.map((j) => ({ value: j.id, label: j.title })), [jobs]);

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* 左侧岗位 */}
      <div className="col-span-12 md:col-span-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm h-full max-h-[calc(100vh-190px)] overflow-y-auto">
          <div className="text-sm text-slate-600 mb-2">岗位列表</div>
          <div className="space-y-2">
            {jobs.map((it) => (
              <button
                key={it.id}
                onClick={() => { setJobId(it.id); setPage(1); }}
                className={`w-full text-left px-3 py-2 rounded border ${jobId === it.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
              >
                {it.title}
              </button>
            ))}
            {!jobs.length && <div className="text-xs text-slate-500">暂无岗位</div>}
          </div>
        </div>
      </div>

      {/* 右侧押题卡片 */}
      <div className="col-span-12 md:col-span-9">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold">押题列表</div>
            <Select value={jobId} options={jobOptions} style={{ width: 240 }} onChange={(v) => { setJobId(v); setPage(1); }} />
          </div>
          {loading ? (
            <div className="py-20 text-center"><Spin /></div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {items.map((it) => (
                  <Card key={it.id} className="cursor-pointer" onClick={() => openModal(it)}>
                    <div className="font-medium truncate" title={it.title}>{it.title}</div>
                    <div className="text-xs text-slate-500 mt-1 line-clamp-3" title={it.description}>{it.description}</div>
                    <div className="text-xs text-slate-400 mt-2">{dayjs(it.created_at).format('YYYY-MM-DD HH:mm')}</div>
                  </Card>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <Pagination current={page} pageSize={pageSize} total={total} onChange={(p) => setPage(p)} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* 弹窗 */}
      <Modal open={open} onCancel={() => setOpen(false)} title="押题详情" footer={null} width={720}>
        {current && (
          <div className="space-y-3">
            <div className="text-xs text-slate-500">创建时间：{dayjs(current.created_at).format('YYYY-MM-DD HH:mm')}</div>
            <div>
              <div className="text-sm mb-1">押题名称</div>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={200} />
            </div>
            <div>
              <div className="text-sm mb-1">押题描述</div>
              <Input.TextArea rows={6} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} maxLength={5000} />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <Button onClick={() => setOpen(false)}>取消</Button>
              <Button danger onClick={onDelete}>删除</Button>
              <Button type="primary" onClick={onSave}>编辑保存</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}


