import { Button, Card, DatePicker, Input, Modal, Select, Spin, Table } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import { listJobs } from '../api/jobs';
import { createInterviewQuestion, createTag, deleteInterviewQuestion, deleteTag, listInterviewQuestions, listTags, updateInterviewQuestion, updateTag } from '../api/questions';
import { message as globalMessage } from '../components/Message';
import PaginationBar from '../components/PaginationBar';

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
  const [editTagId, setEditTagId] = useState<string | undefined>(undefined);

  // 新建弹窗
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTagId, setNewTagId] = useState<string | undefined>(undefined);

  // 筛选条件
  const [filterDay, setFilterDay] = useState<string | undefined>(undefined);
  const [filterTitle, setFilterTitle] = useState('');
  const [filterDesc, setFilterDesc] = useState('');
  const [filterTagId, setFilterTagId] = useState<string | undefined>(undefined);
  // 已应用到查询的条件（点击“筛选”后更新）
  const [appliedDay, setAppliedDay] = useState<string | undefined>(undefined);
  const [appliedTitle, setAppliedTitle] = useState<string | undefined>(undefined);
  const [appliedDesc, setAppliedDesc] = useState<string | undefined>(undefined);
  const [appliedTagId, setAppliedTagId] = useState<string | undefined>(undefined);
  const requestIdRef = useRef(0);

  // 下拉搜索：按 label 文本模糊匹配（忽略大小写）
  const selectFilterOption = (input: string, option?: any) => {
    const label: string = (option?.label ?? option?.children ?? '').toString();
    return label.toLowerCase().includes(input.toLowerCase());
  };

  const applyFilters = () => {
    setAppliedDay(filterDay);
    setAppliedTitle(filterTitle.trim() || undefined);
    setAppliedDesc(filterDesc.trim() || undefined);
    setAppliedTagId(filterTagId);
    setPage(1);
  };

  useEffect(() => {
    (async () => {
      const data = await listJobs();
      const js = (data.items || []).map((j: any) => ({ id: j.id, title: j.title }));
      setJobs(js);
      if (js.length) setJobId(js[0].id);
    })();
  }, []);

  const reloadList = async (targetPage?: number) => {
    const reqId = ++requestIdRef.current;
    if (!jobId) return;
    setLoading(true);
    try {
      const curPage = targetPage ?? page;
      const data = await listInterviewQuestions(jobId, curPage, pageSize, {
        day: appliedDay,
        title: appliedTitle,
        description: appliedDesc,
        tagId: appliedTagId,
      });
      const totalCount = data.total || 0;
      const lastPage = Math.max(1, Math.ceil(totalCount / pageSize));
      if (curPage > lastPage) {
        const newPage = lastPage;
        const data2 = await listInterviewQuestions(jobId, newPage, pageSize, {
          day: appliedDay,
          title: appliedTitle,
          description: appliedDesc,
          tagId: appliedTagId,
        });
        if (requestIdRef.current === reqId) {
          setItems(data2.items || []);
          setTotal(data2.total || 0);
          setPage(newPage);
        }
        return;
      }
      if (requestIdRef.current === reqId) {
        setItems(data.items || []);
        setTotal(totalCount);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadList();
  }, [jobId, page, appliedDay, appliedTitle, appliedDesc, appliedTagId]);

  // 标签列表（用于筛选与管理）
  const [tags, setTags] = useState<Array<{ id: string; name: string }>>([]);
  const [tagMgrOpen, setTagMgrOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  useEffect(() => {
    (async () => {
      const res = await listTags();
      setTags(res.items || []);
    })();
  }, []);

  const openModal = (it: any) => {
    setCurrent(it);
    setEditTitle(it.title || '');
    setEditDesc(it.description || '');
    setEditTagId(it.tag_id || undefined);
    setOpen(true);
  };

  const onSave = async () => {
    if (!current) return;
    try {
      await updateInterviewQuestion(current.id, { title: editTitle, description: editDesc, tagId: editTagId ?? null });
      globalMessage.success('已保存修改');
      setOpen(false);
      await reloadList();
    } catch (e: any) {
      globalMessage.error(e?.message || '保存失败');
    }
  };

  const onDelete = async () => {
    if (!current) return;
    try {
      await deleteInterviewQuestion(current.id);
      globalMessage.success('已删除');
      setOpen(false);
      await reloadList();
    } catch (e: any) {
      globalMessage.error(e?.message || '删除失败');
    }
  };

  // 默认选中第一个岗位后会立即拉取右侧数据

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* 左侧岗位 */}
      <div className="col-span-12 md:col-span-3 min-h-0">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm h-[calc(100vh-175px)] min-h-0 overflow-y-auto">
          <div className="text-sm text-slate-600 mb-2">岗位列表</div>
          <div className="space-y-2">
            {jobs.map((it, idx) => (
              <button
                key={it.id}
                onClick={() => { setJobId(it.id); setPage(1); }}
                className={`relative w-full text-left pl-9 pr-3 py-2 rounded border ${jobId === it.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
              >
                <span className="absolute left-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-5 h-5 rounded bg-blue-100 text-[10px] text-blue-700 font-medium">
                  {idx + 1}
                </span>
                {it.title}
              </button>
            ))}
            {!jobs.length && <div className="text-xs text-slate-500">暂无岗位</div>}
          </div>
        </div>
      </div>

      {/* 右侧押题卡片 */}
      <div className="col-span-12 md:col-span-9 min-h-0">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm md:h-[calc(100vh-175px)] min-h-0 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold"></div>
            <div className="flex items-center gap-2">
              <DatePicker
                placeholder="按日期过滤"
                value={filterDay ? (dayjs as any)(filterDay) : undefined}
                onChange={(d) => { setFilterDay(d ? d.format('YYYY-MM-DD') : undefined); }}
              />
              <Input
                placeholder="按名称"
                value={filterTitle}
                onChange={(e) => { setFilterTitle(e.target.value); }}
                onPressEnter={applyFilters}
                allowClear
                style={{ width: 160 }}
              />
              <Input
                placeholder="按描述"
                value={filterDesc}
                onChange={(e) => { setFilterDesc(e.target.value); }}
                onPressEnter={applyFilters}
                allowClear
                style={{ width: 160 }}
              />
              <Select
                placeholder="按标签"
                allowClear
                value={filterTagId}
                onChange={(v) => setFilterTagId(v)}
                options={tags.map(t => ({ value: t.id, label: t.name }))}
                style={{ width: 160 }}
                showSearch
                filterOption={selectFilterOption}
              />
              <Button onClick={() => setTagMgrOpen(true)}>管理标签</Button>
              <Button onClick={applyFilters}>筛选</Button>
              <Button onClick={() => { setFilterDay(undefined); setFilterTitle(''); setFilterDesc(''); setFilterTagId(undefined); setAppliedDay(undefined); setAppliedTitle(undefined); setAppliedDesc(undefined); setAppliedTagId(undefined); setPage(1); }}>重置</Button>
              <Button type="primary" disabled={!jobId} onClick={() => { setNewTitle(''); setNewDesc(''); setCreateOpen(true); }}>新建押题</Button>
            </div>
          </div>
          {loading ? (
            <div className="py-20 text-center"><Spin /></div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {items.map((it, idx) => (
                  <Card key={it.id} className="relative h-full">
                    <div className="pointer-events-none absolute left-0 top-0">
                      <div className="bg-blue-600 text-white text-[10px] font-semibold px-2 py-1 rounded-br">
                        {(page - 1) * pageSize + idx + 1}
                      </div>
                      <div className="w-0 h-0 border-t-8 border-t-blue-700 border-r-8 border-r-transparent"></div>
                    </div>
                    {/* 标题 + 标签（右上角对齐，但不遮挡内容） */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-base font-semibold text-slate-800 break-words line-clamp-2 min-h-[3.25rem] pr-2">{it.title}</div>
                      {it.tag && (
                        <div className="shrink-0">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full shadow-sm">
                            {it.tag}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* 分割线 */}
                    <div className="my-2 border-t border-slate-200"></div>
                    <div className="text-sm text-slate-600 mt-2 line-clamp-4 break-words leading-5 min-h-[5rem]" title={it.description}>{it.description}</div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                      <span>{dayjs(it.created_at).format('YYYY-MM-DD HH:mm')}</span>
                      <div className="space-x-2">
                        <Button size="small" onClick={() => openModal(it)}>编辑</Button>
                        <Button size="small" danger onClick={async (e) => {
                          e.stopPropagation();
                          await deleteInterviewQuestion(it.id);
                          globalMessage.success('成功删除该条押题数据！');
                          await reloadList();
                        }}>删除</Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-end gap-3 text-sm text-slate-500">
                <PaginationBar page={page} pageSize={pageSize} total={total} onChange={(p)=> setPage(p)} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* 详情弹窗（编辑/删除） */}
      <Modal open={open} onCancel={() => setOpen(false)} title="押题详情" footer={null} width={720}>
        {current && (
          <div className="space-y-3">
            <div className="text-xs text-slate-500">创建时间：{dayjs(current.created_at).format('YYYY-MM-DD HH:mm')}</div>
            <div>
              <div className="text-sm mb-1">标签</div>
              <Select
                allowClear
                placeholder="选择标签"
                value={editTagId}
                onChange={(v) => setEditTagId(v)}
                options={tags.map(t => ({ value: t.id, label: t.name }))}
                className="w-full"
                style={{ height: 40 }}
                showSearch
                filterOption={selectFilterOption}
              />
            </div>
            <div>
              <div className="text-sm mb-1">问题</div>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={200} />
            </div>
            <div>
              <div className="text-sm mb-1">问题描述</div>
              <Input.TextArea rows={12} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} maxLength={5000} />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <Button onClick={() => setOpen(false)}>取消</Button>
              <Button danger onClick={onDelete}>删除</Button>
              <Button type="primary" onClick={onSave}>编辑保存</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 标签管理弹窗 */}
      <Modal open={tagMgrOpen} onCancel={() => setTagMgrOpen(false)} title="标签管理" footer={null} width={880}>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="新建标签名称（不超过20个字）"
              value={newTagName}
              maxLength={20}
              onChange={(e) => {
                const v = e.target.value;
                if (v.length <= 20) setNewTagName(v);
              }}
              style={{ width: 240 }}
            />
            <Button
              type="primary"
              onClick={async () => {
                const v = newTagName.trim();
                if (!v) return;
                if (v.length > 20) {
                  globalMessage.warning('标签名称最多20个字');
                  return;
                }
                await createTag(v);
                setNewTagName('');
                const res = await listTags();
                setTags(res.items || []);
              }}
            >新增</Button>
          </div>
          {/* 固定高度表格，支持编辑/删除与序号显示 */}
          <TagTable tags={tags} onRefresh={async () => { const res = await listTags(); setTags(res.items || []); }} />
        </div>
      </Modal>

      {/* 新建押题弹窗 */}
      <Modal
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        title="新建押题"
        footer={null}
        width={720}
      >
        <div className="space-y-3">
            <div>
            <div className="text-sm mb-1">标签</div>
            <Select
              allowClear
              placeholder="选择标签"
              value={newTagId}
              onChange={(v) => setNewTagId(v)}
              options={tags.map(t => ({ value: t.id, label: t.name }))}
              className="w-full"
              style={{ height: 40 }}
              showSearch
              filterOption={selectFilterOption}
            />
          </div>
          <div>
            <div className="text-sm mb-1">问题</div>
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} maxLength={200} />
          </div>
          <div>
            <div className="text-sm mb-1">问题描述</div>
            <Input.TextArea rows={12} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} maxLength={1000} />
            <div className="text-right text-xs text-slate-500">{newDesc.length} / 1000</div>
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <Button onClick={() => setCreateOpen(false)}>取消</Button>
            <Button type="primary" disabled={!jobId || !newTitle.trim()} onClick={async () => {
              if (!jobId) return;
              await createInterviewQuestion({ jobId, title: newTitle.trim(), description: newDesc, tagId: newTagId ?? null });
              globalMessage.success('已成功创建押题内容！');
              setCreateOpen(false);
              const data = await listInterviewQuestions(jobId!, page, pageSize);
              setItems(data.items || []);
              setTotal(data.total || 0);
            }}>保存</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// 标签管理表格组件
function TagTable({ tags, onRefresh }: { tags: Array<{id:string; name:string; created_at?: number}>; onRefresh: () => Promise<void> }) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [search, setSearch] = useState('');

  const filtered = tags
    .filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.created_at || 0) - (a.created_at || 0));

  const columns: any[] = [
    {
      title: '#',
      dataIndex: 'index',
      width: 100,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => <span className="text-slate-500">{index + 1}</span>,
    },
    {
      title: '标签名',
      dataIndex: 'name',
      width: 200,
      render: (_: any, record: any) => (
        editingKey === record.id ? (
          <Input
            value={editingName}
            maxLength={20}
            onChange={(e) => setEditingName(e.target.value)}
          />
        ) : (
          <span>{record.name}</span>
        )
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 220,
      render: (v: number) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      dataIndex: 'action',
      width: 180,
      render: (_: any, record: any) => (
        <div className="space-x-2">
          {editingKey === record.id ? (
            <>
              <Button size="small" type="primary" onClick={async () => {
                const v = editingName.trim();
                if (!v) return;
                if (v.length > 20) { globalMessage.warning('标签名称最多20个字'); return; }
                await updateTag(record.id, v);
                setEditingKey(null);
                setEditingName('');
                await onRefresh();
              }}>保存</Button>
              <Button size="small" onClick={() => { setEditingKey(null); setEditingName(''); }}>取消</Button>
            </>
          ) : (
            <>
              <Button size="small" onClick={() => { setEditingKey(record.id); setEditingName(record.name); }}>编辑</Button>
              <Button size="small" danger onClick={async () => { await deleteTag(record.id); await onRefresh(); }}>删除</Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="p-2">
        <Input
          placeholder="搜索标签名（模糊匹配）"
          value={search}
          onChange={(e)=>setSearch(e.target.value)}
          allowClear
          style={{ width: 260 }}
        />
      </div>
      <Table
        size="small"
        columns={columns}
        dataSource={filtered}
        rowKey="id"
        pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条` }}
      />
    </div>
  );
}


